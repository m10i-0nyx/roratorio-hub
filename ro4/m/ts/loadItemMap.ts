import { loadFileAsUint8Array, zstdDecompress } from "./funcZstdLoad.js";

// ItemMapの型定義
export interface ItemData {
    id: number; // アイテムID
    displayname: string; // アイテムの表示名
    description: string; // アイテムの説明
    is_card: boolean; // カードアイテムかどうか
    is_enchant: boolean; // エンチャント可能かどうか
    resname: string; // リソース名
    type: string | null; // アイテムタイプ
}
// ハッシュ型配列
let itemMap: Record<number, ItemData> = {};

/**
 * 全てのアイテムを取得する関数
 * @returns アイテムの配列
 */
export function getItemMapIter(): [number, ItemData][] {
    return Object.entries(itemMap).map(
        ([key, value]) => [Number(key), value] as [number, ItemData]
    );
}

/*
* id から Item を取得する関数
* @param id 検索したいアイテムID（数値）
* @returns Item オブジェクトまたは undefined（見つからない場合）
*/
export function getItemMapById(id: number): ItemData | undefined {
    return itemMap[id];
}

/**
 * displayname から Item を取得する関数
 * @param displayName 検索したいアイテム名（完全一致）
 * @returns Item オブジェクトまたは undefined（見つからない場合）
 */
export function getItemMapByDisplayName(displayName: string): ItemData | undefined {
    for (const item of Object.values(itemMap)) {
        if (item.displayname === displayName) {
            return item;
        }
    }
    return undefined;
}

async function loadItemJSON() {
    let compressed = await loadFileAsUint8Array('json/items.json.zst');
    let decompressed = await zstdDecompress(compressed);
    let itemLines = new TextDecoder('utf-8').decode(decompressed);
    try {
        itemMap = JSON.parse(itemLines);
    } catch (err) {
        console.error('JSON parse error:', err);
    }
}

loadItemJSON();
