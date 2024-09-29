const { SlashCommandBuilder, Collection } = require('discord.js');
const logger = require('log4js').getLogger();
const lists = require('../others/lists.js');
const { getList } = require('../others/utils.js');

const cooldowns = new Collection();

module.exports = {
	enabled: true,
	cooldown: 5,
	listCooldown: 3600,
	data: new SlashCommandBuilder()
		.setName('fish')
		.setDescription('GD Lists Fishing')
		.addStringOption(option =>
			option.setName('list')
				.setDescription('The list you want to fish from (your default list can be set with /settings)')
				.setRequired(false)
				.addChoices(lists.map(list => { return {name:list.name, value: list.value}})),),
	async execute(interaction) {
		const { db, cache } = require('../index.js');
	

		const id = interaction.user.id;
		const name = interaction.user.tag;

		const list = await getList(interaction);
		const listData = lists.find(l => l.value === list);

		 const now = Date.now();
		 const userListKey = `${id}-${list}`;
		 const cooldownAmount = this.listCooldown * 1000;
 
		 if (cooldowns.has(userListKey)) {
			 const expirationTime = cooldowns.get(userListKey) + cooldownAmount;
			 if (now < expirationTime) {
				 const expiredTimestamp = Math.round(expirationTime / 1000);
				 return interaction.reply({ content: `Please wait, you are on a cooldown for the \`${list.toUpperCase()}\` list. You can fish again <t:${expiredTimestamp}:R>.`, ephemeral: true });
			 }
		 }
 
		 cooldowns.set(userListKey, now);
		 setTimeout(() => cooldowns.delete(userListKey), cooldownAmount);

		let levels;
		try {
			levels = await cache[list].findAll({ order: [['position', 'ASC']]});
		} catch (error) {
			logger.error('Error fetching levels:', error);
			return await interaction.reply(':x: An error occurred while fetching the levels');
		}
		if (!levels || levels.length === 0) {
			return await interaction.reply(':x: No levels available');
		}

		const level_count = Math.min(levels.length, listData.cutoff ?? levels.length);
		const fished_pos = Math.floor(Math.random() * level_count);
		const fished_level_name = levels[fished_pos].name;
		const fished_level_file = levels[fished_pos].filename;

		const fished_score = lists.find(l => l.value === list).score(fished_pos, level_count);
		
		const userdata = await db[list].findOne({ where: { user: id } });
		let totalAmount;

		if (!userdata) {
			await db[list].create({
				user: id,
				amount: fished_score,
				mean: fished_score,
				fished_list: `["${fished_level_file}"]`,
				fished_list_frequency: '[1]',
				times_fished: 1
			});
			totalAmount = fished_score;
		} else {
			totalAmount = userdata.amount + fished_score;
			timesFished = userdata.times_fished + 1;
			meanScore = totalAmount / timesFished;
			let fishedListData, fishedListFrequencyData;
			try {
				fishedListData = userdata.fished_list ? JSON.parse(userdata.fished_list) : [];
				fishedListFrequencyData = userdata.fished_list_frequency ? JSON.parse(userdata.fished_list_frequency) : [];
			}
			catch (error) {
				logger.error(error);
				return await interaction.reply(':x: An error occurred while getting the fished list data.');
			}
			const fishedIndex = fishedListData.indexOf(fished_level_file);
			if (fishedIndex === -1) {
				fishedListData.push(fished_level_file);
				fishedListFrequencyData.push(1);
			} else {
				fishedListFrequencyData[fishedIndex] += 1;
			}

			let fishedList, fishedListFrequency;
			try {
				fishedList = JSON.stringify(fishedListData);
				fishedListFrequency = JSON.stringify(fishedListFrequencyData);
			} catch (error) {
				logger.error(error);
				return await interaction.reply(':x: An error occurred while saving the fished list data.');
			}

			try {
			await db[list].update({
					amount: totalAmount,
					mean: meanScore,
					fished_list: fishedList,
					fished_list_frequency: fishedListFrequency,
					times_fished: timesFished
				}, {
					where: { user: id }
				});
			} catch (error) {
				logger.error(error);
				return await interaction.reply(':x: An error occurred while updating the user data.');
			}
		}

		return await interaction.reply(`> **${list.toUpperCase()}**\n> **\`${name}\`** fished **${fished_level_name}** (TOP ${fished_pos + 1})\n> +${Math.round(fished_score * 100) / 100} points (Total: ${Math.round(totalAmount * 100) / 100} points)`);
	},
};
