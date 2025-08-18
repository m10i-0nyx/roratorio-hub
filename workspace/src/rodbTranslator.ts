import { load as loadYAML, dump as dumpYAML } from "js-yaml"
import { Zstd } from "@hpcc-js/wasm-zstd";

const zstd = await Zstd.load();

// Base64 → Uint8Array（URLセーフに対応）
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

// Uint8Array → Base64（URLセーフ対応）
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    let base64 = btoa(binary);
    // URLセーフ変換
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return base64;
}

// zstdで展開
function zstdDecompress(compressed: Uint8Array): string | null {
    try {
        // zstd.decompress() で zstd データを展開
        const decompressedData = zstd.decompress(compressed);
        return new TextDecoder('utf-8').decode(decompressedData);
    } catch (err) {
        console.error("展開エラー:", err);
        return null;
    }
}

// zstdで圧縮
function zstdCompress(text: string): Uint8Array | null {
    try {
        // 文字列をUTF-8のUint8Arrayに変換
        const input = new TextEncoder().encode(text);
        // zstd.compress() でzstd圧縮
        return zstd.compress(input);
    } catch (err) {
        console.error("圧縮エラー:", err);
        return null;
    }
}

// Decode => 展開 => YAML load
function decodeProcess(encodedData: string): RodbTranslatorDataFormat | null {
    let dataObject: RodbTranslatorDataFormat | null = null;
    try {
        // デコード => 圧縮データ
        const compressedData = base64ToUint8Array(encodedData);

        // zstdで展開
        const yamlData = zstdDecompress(compressedData);

        if (yamlData) {
            //console.debug(yamlData);
            // YAML文字列 => JavaScriptオブジェクト
            dataObject = loadYAML(yamlData) as RodbTranslatorDataFormat;
        }
    } catch (error) {
        console.error("エラーが発生しました:", error);
    }
    return dataObject;
}

// YAML dump => 圧縮 => Encode
function encodeProcess(dataObject: RodbTranslatorDataFormat): string | null {
    let encodedData: string | null = null;
    try {
        // YAMLオブジェクト => YAML文字列
        const yamlData = dumpYAML(dataObject);

        // zstdで圧縮
        const compressedData = zstdCompress(yamlData);

        if (compressedData) {
            // 圧縮データ => Base64
            encodedData = uint8ArrayToBase64(compressedData);
        }
    } catch (error) {
        console.error("エラーが発生しました:", error);
    }
    return encodedData;
}


export async function loadRodbTranslator(fragment: string): Promise<void> {
    const supportVersion = 2;
    const prefixCheck = /^rtx(\d+):(.+)$/;
    const matches = prefixCheck.exec(fragment);
    if (!matches) {
        return;
    }

    // Version Check
    if (Number(matches[1]) != supportVersion) {
        alert("RODB Translatorから出力された\nフォーマットバージョンが異なるため中止します\nVersion:" + matches[1]);
        return;
    }

    // フラグメントをデコード
    const decodedData = decodeURIComponent(matches[2]);

    // 中身のデコード、zstd展開を行う
    const yamlObject: RodbTranslatorDataFormat | null = decodeProcess(decodedData)
    if (!yamlObject) {
        alert("URLからのデータロードに失敗しました");
        return;
    }
    //console.debug(yamlObject);

    // ローディングインジケーターを表示
    showLoadingIndicator();

    // Set Job
    const jobElement = document.getElementById("OBJID_SELECT_JOB") as HTMLSelectElement;
    jobElement.value = yamlObject.status.job_id;
    changeJobSettings(yamlObject.status.job_id);

    // Set Base Lv
    const baseLvElement = document.getElementById("OBJID_SELECT_BASE_LEVEL") as HTMLInputElement;
    baseLvElement.value = String(yamlObject.status.base_lv);

    // Set Job Lv
    const jobLvElement = document.getElementById("OBJID_SELECT_JOB_LEVEL") as HTMLInputElement;
    jobLvElement.value = String(yamlObject.status.job_lv);

    // Set status
    const keys: (keyof JobStatus)[] = [
        "str", "agi", "vit", "int", "dex", "luk",
        "pow", "sta", "wis", "spl", "con", "crt"
    ];

    for (const key of keys) {
        const statusElement: HTMLInputElement = document.getElementById("OBJID_SELECT_STATUS_" + key.toUpperCase()) as HTMLInputElement;
        let value = yamlObject.status[key];
        statusElement.value = String(value);
    }

    // Set Skill Lv
    const skillColumnCheckbox: HTMLInputElement = document.getElementById("OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX") as HTMLInputElement;
    skillColumnCheckbox.checked = true;
    OnClickSkillSWLearned();

    Object.entries(yamlObject.skills).forEach(([skillId, skill]) => {
        const skillLvElement: HTMLSelectElement = document.querySelector(`select[data-skill-id=${skillId}]`) as HTMLSelectElement;
        if (skillLvElement) {
            skillLvElement.value = String(skill.lv);
            //console.debug(`Skill ID: ${skillId}, 習得レベル: ${skillLvElement.value}`)
            const event = new Event('change', { bubbles: true });
            skillLvElement.dispatchEvent(event);
        }
    });

    // 計算
    CalcStatusPoint(true);
    StAllCalc();
    AutoCalc();

    // ローディングインジケーターを非表示
    hideLoadingIndicator();
}

interface JobStatus {
    job_id: string;
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
    [skillId: string]: Skill;
}

interface AdditionalInfo {
    hp_base_point: number;
    sp_base_point: number;
    character_name: string;
    world_name: string;
}

interface RodbTranslatorDataFormat {
    format_version: number;
    overwrite: boolean;
    status: JobStatus;
    skills: Skills;
    equipments: object;
    items: object;
    supports: object;
    additional_info: AdditionalInfo;
    battle_info: object;
}
