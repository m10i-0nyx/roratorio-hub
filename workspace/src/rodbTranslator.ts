import { load as loadYAML, dump as dumpYAML, dump } from "js-yaml"
import { Zstd } from "@hpcc-js/wasm-zstd";
import { JobMap } from "./loadJobMap";

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
function decodeProcess(encodedData: string): RtxDataFormat | null {
    let dataObject: RtxDataFormat | null = null;
    try {
        // デコード => 圧縮データ
        const compressedData = base64ToUint8Array(encodedData);

        // zstdで展開
        const yamlData = zstdDecompress(compressedData);

        if (yamlData) {
            //console.debug(yamlData);
            // YAML文字列 => JavaScriptオブジェクト
            dataObject = loadYAML(yamlData) as RtxDataFormat;
        }
    } catch (error) {
        console.error("エラーが発生しました:", error);
    }
    return dataObject;
}

// YAML dump => 圧縮 => Encode
function encodeProcess(dataObject: RtxDataFormat): string | null {
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


export async function loadRodbTranslator(importData: string): Promise<void> {
    const supportVersion = 2;
    const prefixCheck = /^rtx(\d+):(.+)$/;
    const matches = prefixCheck.exec(importData);
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
    const dataObject: RtxDataFormat | null = decodeProcess(decodedData)
    if (!dataObject) {
        alert("URLからのデータロードに失敗しました");
        return;
    }
    console.debug(dataObject);

    importRtxDataFormat(dataObject);
}

async function importRtxDataFormat(dataObject: RtxDataFormat): Promise<void> {
    // ローディングインジケーターを表示
    showLoadingIndicator();

    setTimeout(() => {
        const changeEvent = new Event('change', { bubbles: true });

        // Set Job
        const jobElement = document.getElementById("OBJID_SELECT_JOB") as HTMLSelectElement;
        jobElement.value = dataObject.status.job_id;
        jobElement.dispatchEvent(changeEvent);

        // Set Base Lv
        const baseLvElement = document.getElementById("OBJID_SELECT_BASE_LEVEL") as HTMLInputElement;
        baseLvElement.value = String(dataObject.status.base_lv);

        // Set Job Lv
        const jobLvElement = document.getElementById("OBJID_SELECT_JOB_LEVEL") as HTMLInputElement;
        jobLvElement.value = String(dataObject.status.job_lv);

        // Set status
        const keys: (keyof RtxJobStatus)[] = [
            "str", "agi", "vit", "int", "dex", "luk",
            "pow", "sta", "wis", "spl", "con", "crt"
        ];

        for (const key of keys) {
            const statusElement = document.getElementById("OBJID_SELECT_STATUS_" + key.toUpperCase()) as HTMLInputElement;
            let value = dataObject.status[key];
            statusElement.value = String(value);
        }

        // Set Skill Lv
        const skillColumnCheckbox = document.getElementById("OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX") as HTMLInputElement;
        skillColumnCheckbox.checked = true;
        OnClickSkillSWLearned();

        Object.entries(dataObject.learned_skills).forEach(([skillId, skill]) => {
            const skillLvElement = document.querySelector(`select[data-skill-id=${skillId}]`) as HTMLSelectElement;
            if (skillLvElement) {
                skillLvElement.value = String(skill.lv);
                //console.debug(`Skill ID: ${skillId}, 習得レベル: ${skillLvElement.value}`)
                skillLvElement.dispatchEvent(changeEvent);
            }
        });

        // 計算
        CalcStatusPoint(true);
        StAllCalc();
        AutoCalc();

        // ローディングインジケーターを非表示
        hideLoadingIndicator();
    }, 0);
}

async function outputConsoleRtxDataFormat(): Promise<void> {
    try {
        const dataObject = exportRtxDataFormat();
        console.log(dataObject);
        console.log(dumpYAML(dataObject));
        alert("🐱‍💻データをコンソールに出力しました");
    } catch (ex) {
        console.error("Error occurred while outputting console Rtx data format:", ex);
    }
    //const encodedData = encodeProcess(dataObject);
}

export function exportRtxDataFormat(): RtxDataFormat {
    let dataObject: RtxDataFormat = {
        format_version: 2,
        overwright: true,
        status: {} as RtxJobStatus,
        learned_skills: {} as RtxSkills,
        equipments: {} as RtxEquipments,
        use_items: {} as RtxUseItems,
        buff: {} as RtxSkills,
        debuff: {} as RtxSkills,
        additional_info: {} as RtxAdditionalInfo,
        battle_info: {}
    };

    // Set Job
    const jobElement = document.getElementById("OBJID_SELECT_JOB") as HTMLSelectElement;
    dataObject.status.job_id = jobElement.value;
    //dataObject.status.job_class_localization = JobMap.getById(jobElement.value)?.getNameJa();

    // Set Base Lv
    const baseLvElement = document.getElementById("OBJID_SELECT_BASE_LEVEL") as HTMLInputElement;
    dataObject.status.base_lv = Number(baseLvElement.value);

    // Set Job Lv
    const jobLvElement = document.getElementById("OBJID_SELECT_JOB_LEVEL") as HTMLInputElement;
    dataObject.status.job_lv = Number(jobLvElement.value);

    // Set status
    const keys = [
        "str", "agi", "vit", "int", "dex", "luk",
        "pow", "sta", "wis", "spl", "con", "crt"
    ] as const;

    type StatusKey = typeof keys[number];
    for (const key of keys as readonly StatusKey[]) {
        const statusElement = document.getElementById("OBJID_SELECT_STATUS_" + key.toUpperCase()) as HTMLSelectElement;
        dataObject.status[key] = Number(statusElement.value);
    }

    // Equipments
    if (dataObject.equipments) {
        // 右腕武器
        const armsTypeRight = document.getElementById("OBJID_ARMS_TYPE_RIGHT") as HTMLSelectElement;
        if (armsTypeRight) {
            dataObject.equipments.arms_type_right = armsTypeRight.value;
        }
    }

    // Use Items
    if (dataObject.use_items) {
        // スピードアップポーション
        const speedUpPotionElement = document.getElementById("OBJID_SPEED_POT") as HTMLSelectElement;
        if (speedUpPotionElement) {
            dataObject.use_items.speed_up_potion = speedUpPotionElement.value;
        }
    }

    return dataObject;
}

interface RtxDataFormat {
    format_version: number;
    overwright: boolean;
    status: RtxJobStatus;
    learned_skills: RtxSkills;
    equipments?: RtxEquipments;
    use_items?: RtxUseItems;
    buff?: RtxSkills;
    debuff?: RtxSkills;
    additional_info?: RtxAdditionalInfo;
    battle_info?: object;
}

interface RtxJobStatus {
    job_id: string;
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

interface RtxSkill {
    lv: number;
}

interface RtxSkills {
    [skillId: string]: RtxSkill;
}

interface RtxEquipments {
    arms_type_right: string;
    arms_right: {
        refine: number,
        transcendence: number,
        name: string,
        element: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    arms_left?: {
        refine: number,
        transcendence: number,
        name: string,
        element: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    head_top: {
        refine: number,
        transcendence: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    head_midle: {
        refine: number,
        transcendence: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    head_under: {
        refine: number,
        transcendence: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    shield?: {
        refine: number,
        transcendence: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    body: {
        refine: number,
        transcendence: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    shoulder: {
        refine: number,
        transcendence: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    shoes: {
        refine: number,
        transcendence: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    accesorry1: {
        refine?: number,
        transcendence?: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    },
    accesorry2: {
        refine?: number,
        transcendence?: number,
        name: string,
        slot: {
            [slotId: number]: {
                name: string
            }
        }
    }
}

interface RtxUseItems {
    speed_up_potion: string;
}


interface RtxAdditionalInfo {
    hp_base_point?: number;
    sp_base_point?: number;
    character_name?: string;
    world_name?: string;
    comment?: string;
}

(window as any).outputConsoleRtxDataFormat = outputConsoleRtxDataFormat; //グローバルに登録
