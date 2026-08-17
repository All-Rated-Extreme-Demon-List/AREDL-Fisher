import { Logger } from 'commandkit';

export type ListLevel = {
    name: string;
    position: number;
    filename: string;
};

export type ListLevelWithPoints = ListLevel & {
    points: number;
};

type ListWithCacheOnly = {
    cache: () => Promise<ListLevelWithPoints[]>;
};

type ListWithScore = (
    | {
          cache: () => Promise<ListLevel[]>;
      }
    | {
          repo: string;
      }
) & {
    score: (position: number, level_count: number) => number;
};

export type List = {
    name: string;
    fullname: string;
    value: string;
    cutoff: number | null;
} & (ListWithCacheOnly | ListWithScore);

type AREDLLevel = {
    name: string;
    position: number;
    status: 'MainList' | 'Legacy' | 'Pending' | 'Removed';
    points: number;
};

type IDLLevel = {
    name: string;
    position: number;
    id: string;
};

type ChallengeListLevel = {
    name: string;
    position: number;
    id: string;
};

type PemonlistLevel = {
    name: string;
    placement: number;
    level_id: string;
};

type ILLLevel = {
    level: {
        id: number;
        name: string;
        levelPoints: number;
        rank: number;
    };
};

export const lists = [
    {
        name: 'AREDL',
        fullname: 'All Rated Extreme Demons List',
        value: 'aredl',
        cutoff: null,
        cache: async () => {
            try {
                const list = await fetch(
                    'https://api.aredl.net/v2/api/aredl/levels?exclude_legacy=true&exclude_pending=true&exclude_removed=true',
                );
                return ((await list.json()) as AREDLLevel[]).map((level) => {
                    return {
                        name: level.name,
                        position: level.position,
                        filename: level.name
                            .toLowerCase()
                            .replace(/[\s()]+/g, '_')
                            .replace(/[^a-z0-9_]/g, '')
                            .replace(/_+/g, '_')
                            .replace(/^_+|_+$/g, ''),
                        points: level.points / 10,
                    };
                });
            } catch (error) {
                Logger.error('Failed to fetch AREDL: ' + error);
                return [];
            }
        },
    },
    {
        name: 'HDL',
        fullname: 'Hard Demon List',
        value: 'hdl',
        repo: 'https://github.com/Robaleg9/HardDemonList.git',
        cutoff: 150,
        score: (pos, _) => {
            return -0.22371358 * pos + 50.22371358;
        },
    },
    {
        name: 'IDL',
        fullname: 'Insane Demon List',
        value: 'idl',
        cutoff: 150,
        cache: async () => {
            try {
                const list = await fetch(
                    'https://insanedemonlist.com/api/levels',
                );
                return ((await list.json()) as IDLLevel[]).map((level) => {
                    return {
                        name: level.name,
                        position: level.position,
                        filename: level.id,
                    };
                });
            } catch (error) {
                Logger.error('Failed to fetch IDL: ' + error);
                return [];
            }
        },
        score: (pos, _) => {
            if (pos > 150) return 0;
            return Math.round(100 * ((74875 - 375 * pos) / 298)) / 100;
        },
    },
    {
        name: 'CL',
        fullname: 'Challenge List',
        value: 'cl',
        cutoff: 100,
        cache: async () => {
            try {
                const list = await fetch(
                    'https://challengelist.gd/api/v1/demons/?limit=100',
                );
                return ((await list.json()) as ChallengeListLevel[]).map(
                    (level) => {
                        return {
                            name: level.name,
                            position: level.position,
                            filename: level.id,
                        };
                    },
                );
            } catch (error) {
                Logger.error('Failed to fetch Challenge List: ' + error);
                return [];
            }
        },
        score: (pos, level_count) => {
            return (
                250.0 *
                Math.exp(
                    (Math.log(250.0 / 15.0) / (1.0 - level_count)) *
                        (pos - 1.0),
                )
            );
        },
    },
    {
        name: 'UDL',
        fullname: 'Unrated Demon List',
        value: 'udl',
        repo: 'https://github.com/Unrated-Demon-List/unrated-demon-list.git',
        cutoff: 150,
        score: (pos, _) => {
            if (pos > 150) return 0;
            return (
                (140 * 250.0 + 7000) / Math.sqrt(3157 * (pos - 1) + 19600) - 50
            );
        },
    },
    {
        name: '2PL',
        fullname: '2 Player List',
        value: '2pl',
        repo: 'https://github.com/2plist/2plist.git',
        cutoff: 75,
        score: (pos, _) => {
            return 164.498 * Math.exp(-0.0982586 * pos) + 0.896325;
        },
    },
    {
        name: 'TSL',
        fullname: 'The Shitty List',
        value: 'tsl',
        repo: 'https://github.com/TheShittyList/TheShittyListPlus.git',
        cutoff: 150,
        score: (pos, _) => {
            return -24.9975 * Math.pow(pos - 1, 0.4) + 200;
        },
    },
    {
        name: 'PL',
        fullname: 'Pemonlist',
        value: 'pl',
        cutoff: 150,
        cache: async () => {
            const logger = require('log4js').getLogger();
            try {
                const list = await fetch(
                    'https://pemonlist.com/api/list?limit=150',
                );
                return ((await list.json()).data as PemonlistLevel[]).map(
                    (level) => {
                        return {
                            name: level.name,
                            position: level.placement,
                            filename: level.level_id,
                        };
                    },
                );
            } catch (error) {
                logger.error('Failed to fetch Pemonlist: ' + error);
                return [];
            }
        },
        score: (pos, _) => {
            return pos <= 150
                ? Math.round(
                      190.5 / (Math.log10(0.0032 * (pos + 89.8)) + 1) - 211.29,
                  )
                : 0;
        },
    },
    {
        name: 'ILL',
        fullname: 'Impossible Levels List',
        value: 'ill',
        cache: async () => {
            try {
                const list = await fetch(
                    'https://api.impossiblelevels.com/api/Levels/details?showHidden=false&page=1&pageSize=10000&sortBy=rank&sortDirection=asc&listType=ILL',
                );
                return ((await list.json()).data as ILLLevel[]).map(
                    ({ level }) => {
                        return {
                            name: level.name,
                            position: level.rank,
                            filename: String(level.id),
                            points: level.levelPoints,
                        };
                    },
                );
            } catch (error) {
                Logger.error('Failed to fetch ILL: ' + error);
                return [];
            }
        },
        cutoff: null,
    },
] as const satisfies readonly List[];

export default lists;

export type AvailableList = (typeof lists)[number];
export type AvailableListValue = AvailableList['value'];
