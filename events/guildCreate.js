const { Events } = require('discord.js');
const logger = require('log4js').getLogger();

module.exports = {
	name: Events.GuildCreate,
	once: true,
	async execute(guild) {
		const { db } = require('../index.js');
		logger.info('Event - GuildCreeate - ' + `Joined new guild: ${guild.name} (${guild.id})`);
		try {
			const guildExists = await db.guilds.findOne({ where: { guild_id: guild.id } });
			if (guildExists) {
				logger.info('Event - GuildCreeate - ' + `Guild already exists in database, updating`);
				await db.guilds.update({ guild_name: guild.name, guild_member_count: guild.memberCount, enabled: true }, { where: { guild_id: guild.id } });
			} else {
				logger.info('Event - GuildCreeate - ' + `Guild does not exist in database, adding`);
				await db.guilds.create({
					guild_id: guild.id,
					guild_name: guild.name,
					guild_member_count: guild.memberCount,
					enabled: true,
				});
			}
		} catch (error) {
			logger.error('Event - GuildCreeate - ' + `Sequelize error: ${error}`);
		}
		return;
	},
};
