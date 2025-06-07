import { loadFileAsUint8Array, zstdDecompress } from "./funcZstdLoad.js";

export interface JobData {
    id_name: string, //ID
    id_num: number, //ID Num
    is_doram: boolean, //ドラムかどうか
    _mig_id_name: string, //MIG ID Name
    _mig_id_num: number, //MIG ID Num
    name: string, //名前(英語)
    name_ja: string, //名前(日本語)
    name_ja_alias: string[], //名前(日本語)の別名
    is_rebirthed: boolean, //転生職かどうか
    job_type_num: number, //職業タイプ
    job_type_name: string,  //職業タイプ名
    weight_correction: number, //重量補正
    weapons_aspd: {}, //武器ASPD
    additional_status: {}, //追加ステータス
    hp_basic_values: number[], //基本HP
    sp_basic_values: number[], //基本SP
    learned_skills: number[], //習得スキル
    passive_skills: number[], //パッシブスキル
    attack_skills: number[],  //攻撃スキル
    allow_equipment_weapons_type: number[] //装備可能武器タイプ
}

let jobMap: Record<string, JobData> = {};

/**
 * 全ての職業を取得する関数
 * @returns 職業の配列
 */
export function getJobMapIter(): [string, JobData][] {
    return Object.entries(jobMap);
}

/**
 * id_name から Job を取得する関数
 * @param idName 検索したい職業ID名（例: "NOVICE"）
 * @returns Job オブジェクトまたは undefined（見つからない場合）
 */
export function getJobMapByIdName(idName: string): JobData | undefined {
    return jobMap[idName];
}

/**
 * id_num から Job を取得する関数
 * @param idNum 検索したい職業ID番号
 * @returns Job オブジェクトまたは undefined（見つからない場合）
 */
export function getJobMapByIdNum(idNum: number): JobData | undefined {
    for (const job of Object.values(jobMap)) {
        if (job.id_num === idNum) {
            return job;
        }
    }
    return undefined;
}

async function loadJobJSON() {
    let compressed = await loadFileAsUint8Array('json/jobs.json.zst');
    let decompressed = await zstdDecompress(compressed);
    let jobLines = new TextDecoder('utf-8').decode(decompressed);
    try {
        jobMap = JSON.parse(jobLines);
    } catch (err) {
        console.error('JSON parse error:', err);
    }
}

loadJobJSON();
