//@ts-ignore
import * as pako from "pako";
import { JobMap } from "./loadJobMap.js";

// Base64デコード関数（URLセーフに対応）
function base64ToUint8Array(base64: string): Uint8Array {
    // パディングの補完
    let paddedBase = base64.replace(/-/g, '+').replace(/_/g, '/');
    const padding = paddedBase.length % 4;
    if (padding === 2) paddedBase += '==';
    else if (padding === 3) paddedBase += '=';

    const binaryString = atob(paddedBase);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// zlibで解凍
function zlibDecompress(compressed: Uint8Array): string | null {
    try {
        // pako.inflate() で zlib データを解凍
        const decompressedData = globalThis.pako.inflate(compressed);
        return new TextDecoder('utf-8').decode(decompressedData);
    } catch (err) {
        console.error("解凍エラー:", err);
        return null;
    }
}

// Decode => 解凍 => JSON復元
function decodeProcess(encodedData: string): RodbTranslatorJsonFormat | null {
    let jsonObject: RodbTranslatorJsonFormat | null = null;
    try {
        // デコード => 圧縮データ
        const compressedData = base64ToUint8Array(encodedData);

        // zlibで解凍
        const jsonString = zlibDecompress(compressedData);

        if (jsonString) {
            // JSON文字列 => JavaScriptオブジェクト
            jsonObject = JSON.parse(jsonString);
            //console.debug("Decoded JSON:", jsonObject);
        }
    } catch (error) {
        console.error("エラーが発生しました:", error);
    }

    return jsonObject;
}

async function fetchSearchSkill(seachUrls: string[]): Promise<void> {
    try {
        // URLごとにリクエストを作成
        const requests = seachUrls.map(url => fetch(url));
        // すべてのリクエストが完了するまで待機
        const responses = await Promise.all(requests);

        // 各レスポンスごとに処理を実行
        const data = await Promise.all(responses.map(async (response, idx) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const jsonData = await response.json();

            // URLごとに異なる処理を追加する場合はここに追加
            //console.debug(`Data from URL ${idx}:`, jsonData);
            const skillLvElement: HTMLSelectElement = document.getElementById("OBJID_SELECT_LEARNED_SKILL_LEVEL_" + jsonData.ratorio_skill_num) as HTMLSelectElement;
            skillLvElement.setAttribute("data-skill-name", jsonData.skill_name);
        }));
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

export async function loadRodbTranslator(fragment: string): Promise<void> {
    const prefixCheck = /^#rtx(\d+):(.+)$/;
    const matches = prefixCheck.exec(fragment);
    if (!matches) {
        return;
    }

    // Version Check
    if (Number(matches[1]) != 1) {
        alert("RODB Translatorから出力された\nフォーマットバージョンが異なるため中止します\nVersion:" + matches[1]);
        return;
    }

    // フラグメントをデコード
    const decodedData = decodeURIComponent(matches[2]);

    // 中身のデコード、zlib解凍を行う
    const jsonObject: RodbTranslatorJsonFormat | null = decodeProcess(decodedData)
    if (!jsonObject) {
        alert("URLからのデータロードに失敗しました");
        return;
    }

    /*
    // 対処済みのためコメントアウト
    // https://github.com/ragnarok-online-japan/translator/issues/1
    if (!jsonObject.status.ratorio_job_id_num && jsonObject.status.job_class_localization == "インクイジター") {
        jsonObject.status.ratorio_job_id_num = 74;
        jsonObject.status.job_class = "inquisitor";
    }
    */
    let job_id = jsonObject.status.job_class.toUpperCase()
    let player_job_data = JobMap.getById(jsonObject.status.job_class.toUpperCase());
    if (!player_job_data) {
        return;
    }

    // Set Job
    const job_element = document.getElementById("OBJID_SELECT_JOB") as HTMLSelectElement;
    job_element.value = String(jsonObject.status.ratorio_job_id_num);
    const job_container = document.getElementById("select2-OBJID_SELECT_JOB-container");
    if (job_container) {
        job_container.textContent = jsonObject.status.job_class_localization;
    }
    globalThis.Equip.changeJobSettings(job_id);

    // Set Base Lv
    const base_lv_element = document.getElementById("OBJID_SELECT_BASE_LEVEL") as HTMLSelectElement;
    base_lv_element.value = String(jsonObject.status.base_lv);

    // Set Job Lv
    const job_lv_element = document.getElementById("OBJID_SELECT_JOB_LEVEL") as HTMLSelectElement;
    job_lv_element.value = String(jsonObject.status.job_lv);

    // Set status
    const keys: (keyof JobStatus)[] = [
        "str", "agi", "vit", "int", "dex", "luk",
        "pow", "sta", "wis", "spl", "con", "crt"
    ];

    for (const key of keys) {
        const statusElement: HTMLInputElement = document.getElementById("OBJID_SELECT_STATUS_" + key.toUpperCase()) as HTMLInputElement;
        let value = jsonObject.status[key];
        statusElement.value = String(value);
    }

    // Set Skill Lv
    const skill_column_checkbox: HTMLInputElement = document.getElementById("OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX") as HTMLInputElement;
    skill_column_checkbox.checked = true;
    globalThis.LearnedSkill.OnClickSkillSWLearned(player_job_data);

    /*
    let seach_urls = [];
    const url_prefix = "https://rodb.aws.0nyx.net/translator/approximate_search/skill";
    let idx = 0;
    while (true) {
        const skill_name_element: HTMLTableCellElement = document.getElementById("OBJID_TD_LEARNED_SKILL_NAME_" + idx) as HTMLTableCellElement;
        if (!skill_name_element) {
            break;
        }

        const skillName = skill_name_element.textContent?.trim();
        if (skillName) {
            seach_urls.push(`${url_prefix}?word=${encodeURIComponent(skillName)}&ratorio_skill_num=${idx}`);
        }

        idx++;
    }
    // スキルのSelectBoxにdata-skill-name属性を付与
    await fetchSearchSkill(seach_urls);
    */

    Object.entries(jsonObject.skills).forEach(([skill_id, skill]) => {
        const skillLv_element: HTMLSelectElement = document.getElementById(`OBJID_TD_LEARNED_SKILL_LEVEL.${skill_id}]`) as HTMLSelectElement;
        if (skillLv_element) {
            skillLv_element.value = String(skill.lv);
            console.log(`${skill_id} : ${skillLv_element.value}`);
            const event = new Event('change', { bubbles: true });
            skillLv_element.dispatchEvent(event);
        }
    });

    // 計算
    globalThis.HmJob.CalcStatusPoint(true);
    globalThis.Foot.StAllCalc();
    globalThis.Head.AutoCalc("");
}

interface JobStatus {
    job_class: string;
    job_class_localization: string,
    ratorio_job_id_num: number;
    base_lv: number;
    job_lv: number;
    str: number;
    agi: number;
    vit: number;
    int: number;
    dex: number;
    luk: number;
    pow: number;
    sta: number;
    wis: number;
    spl: number;
    con: number;
    crt: number;
}

interface Skill {
    lv: number;
}

interface Skills {
    [skillName: string]: Skill;
}

interface AdditionalInfo {
    hp_base_point: number;
    sp_base_point: number;
    character_name: string;
    world_name: string;
}

interface RodbTranslatorJsonFormat {
    format_version: number;
    overwrite: boolean;
    status: JobStatus;
    skills: Skills;
    equipments: object;
    items: object;
    supports: object;
    additional_info: AdditionalInfo;
}

declare global {
    var loadRodbTranslator: (fragments: string) => Promise<void>;
    var Equip: {
        changeJobSettings: (job_id: string) => void;
    };
    var LearnedSkill: {
        OnClickSkillSWLearned: (player_job_data: any) => void;
    };
    var HmJob: {
        CalcStatusPoint: (flag: boolean) => void;
    };
    var Foot: {
        StAllCalc: () => void;
    };
    var Head: {
        AutoCalc: (arg: string) => void;
    };
}

// グローバルに代入
globalThis.loadRodbTranslator = loadRodbTranslator;
