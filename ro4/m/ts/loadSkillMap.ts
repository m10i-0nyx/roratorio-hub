import { loadFileAsUint8Array, zstdDecompress } from "./funcZstdLoad.js";

// SkillMapの型定義
export interface SkillData {
    _mig_id: string | null; // 移行中データ MIG ID
    _mig_id2: string | null; // 移行中データ MIG ID 2
    _mig_id_num: number | null; // 移行中データ MIG ID 数値
    _mig_name: string | null; // 移行中データ MIG 名称
    attack_range: Record<number, number> | null; // 攻撃範囲
    id: string; // スキルID
    id_num: number; // スキルID（数値）
    max_lv: number | null; // 最大レベル
    name: string | null; // スキル名
    need_skill_list: {
        need_lv: number; // 必要レベル
        skill_id: string; // 必要スキルID
    }[] | null; // 必要スキルリスト
    seperate_lv: boolean | null; // レベル分離
    sp_amount: Record<number, number> | null; // SP消費量
    type: string | null; // スキルタイプ
}
// ハッシュ型配列
let skillMap: Record<string, SkillData> = {};

/**
 * 全てのスキルを取得する関数
 * @returns スキルの配列
 */
export function getSkillMapIter(): [string, SkillData][] {
    return Object.entries(skillMap);
}

/**
 * id から Skill を取得する関数
 * @param id 検索したいスキルID（例: "NV_BASIC"）
 * @returns Skill オブジェクトまたは undefined（見つからない場合）
 */
export function getSkillMapById(id: string): SkillData | undefined {
    return skillMap[id];
}

/**
 * id_num から Skill を取得する関数
 * @param num 取得したいスキルの id_num（数値）
 * @returns Skill オブジェクトまたは undefined（見つからない場合）
 */
export function getSkillMapByIdNum(num: number): SkillData | undefined {
    for (const skill of Object.values(skillMap)) {
        if (skill.id_num === num) {
            return skill;
        }
    }
    return undefined;
}

/**
 * _mig_id から Skill を取得する関数
 * @param num 取得したいスキルの _mig_id2（文字列）
 * @returns Skill オブジェクトまたは undefined（見つからない場合）
 */
export function getSkillMapByMigId(id: string): SkillData | undefined {
    for (const skill of Object.values(skillMap)) {
        if (skill._mig_id === id) {
            return skill;
        }
    }
    return undefined;
}

/**
 * _mig_id2 から skill.h.jsで定義していた数値を取得する関数
 * @param num 取得したいスキルの _mig_id2（文字列）
 * @returns MIG_IDの数値 または -1（見つからない場合）
 */
export function getMigIdFromSkillMapByMigId2(id: string): number {
    for (const skill of Object.values(skillMap)) {
        if (skill._mig_id2 === id) {
            if (skill._mig_id_num !== null) {
                // _mig_id2が一致し、_mig_id_numがnullでない場合
                return skill._mig_id_num;
            }
            break; // _mig_id_numがnullの場合はスキップ
        }
    }
    return -1;
}

async function loadSkillJSON() {
    let compressed = await loadFileAsUint8Array('json/skills.json.zst');
    let decompressed = await zstdDecompress(compressed);
    let skillLines = new TextDecoder('utf-8').decode(decompressed);
    try {
        skillMap = JSON.parse(skillLines);
    } catch (err) {
        console.error('JSON parse error:', err);
    }
}

loadSkillJSON();
