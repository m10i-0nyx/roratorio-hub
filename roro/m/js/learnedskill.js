"use strict";
import * as Equipt from "./equip.js";

var n_SkillSWLearned = false;

globalThis.LEARNED_SKILL_MAX_COUNT = 200;

//================================================================================================
//================================================================================================
//====
//==== 習得スキル欄
//====
//================================================================================================
//================================================================================================

globalThis.n_A_LearnedSkill = new Array();
for (var dmyidx = 0; dmyidx < LEARNED_SKILL_MAX_COUNT; dmyidx++) {
    globalThis.n_A_LearnedSkill[dmyidx] = 0;
}

export function LearnedSkillSearch(skillId) {

    var idx = 0;
    var learnSkillIdArray = g_constDataManager.GetDataObject(CONST_DATA_KIND_JOB, n_A_JOB).GetLearnSkillIdArray();


    for (idx = 0; idx < learnSkillIdArray.length; idx++) {
        if (learnSkillIdArray[idx] == skillId) {
            return globalThis.n_A_LearnedSkill[idx];
        }
    }

    return 0;

}

export function OnClickSkillSWLearned(player_job_data) {
    if (player_job_data === undefined) {
        return;
    }
    // チェックボックスのチェック状態を取得
    n_SkillSWLearned = false;
    let obj_checkbox = document.getElementById("OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX");
    if (obj_checkbox) {
        n_SkillSWLearned = obj_checkbox.checked;
    }



    // 設定欄を初期化
    let obj_root = document.getElementById("ID_SKILL_LEARNED");
    while (obj_root.firstChild) {
        obj_root.removeChild(obj_root.firstChild);
    }

    // 設定欄テーブルを再構築
    let obj_table = document.createElement("table");
    obj_table.setAttribute("border", 1);
    obj_root.appendChild(obj_table);

    let obj_tbody = document.createElement("tbody");
    obj_table.appendChild(obj_tbody);



    // 設定欄のヘッダ部分を構築
    var obj_tr = document.createElement("tr");
    obj_tbody.appendChild(obj_tr);

    var obj_td = document.createElement("td");
    obj_td.setAttribute("id", "OBJID_SKILL_COLUMN_HEADER_LEARNED");
    obj_td.setAttribute("class", "title");
    obj_td.setAttribute("colspan", 6);
    obj_tr.appendChild(obj_td);

    // 設定欄展開用チェックボックス
    var obj_input = document.createElement("input");
    obj_input.setAttribute("type", "checkbox");
    obj_input.setAttribute("id", "OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX");
    obj_input.setAttribute("onClick", "LearnedSkill.OnClickSkillSWLearned()");
    if (n_SkillSWLearned) {
        // 部品を再構築しているので、チェック状態の再設定が必要
        obj_input.setAttribute("checked", "checked");
    }
    obj_td.appendChild(obj_input);

    let obj_label = HtmlCreateElement("label", obj_td);
    obj_label.setAttribute("for", "OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX");
    HtmlCreateTextNode("習得スキル", obj_label);

    let obj_span = document.createElement("span");
    obj_span.setAttribute("id", "OBJID_SKILL_COLUMN_USEDTEXT_LEARNED");
    obj_td.appendChild(obj_span);

    let obj_text = document.createTextNode("　　");
    obj_td.appendChild(obj_text);

    // 注意喚起テキスト
    obj_span = document.createElement("span");
    obj_span.setAttribute("id", "ID_SKILL_LEARNED_NOTICE");
    obj_span.setAttribute("style", "color : red");
    obj_td.appendChild(obj_span);

    Equipt.UpdateLearnedSkillNotice();


    // 設定欄の注意書き部分を構築
    var obj_tr = document.createElement("tr");
    obj_tbody.appendChild(obj_tr);

    var obj_td = document.createElement("td");
    obj_td.style.whiteSpace = "nowrap";
    obj_td.setAttribute("colspan", 6);
    obj_tr.appendChild(obj_td);

    obj_text = document.createTextNode("この設定欄は一部の装備が持つ「スキル習得時に発動する効果」のトリガーとして使われています");
    obj_td.appendChild(obj_text);
    obj_td.appendChild(document.createElement("br"));
    obj_text = document.createTextNode("パッシブスキルの効果計算や攻撃スキルのダメージ計算には使われていないので");
    obj_td.appendChild(obj_text);
    obj_td.appendChild(document.createElement("br"));
    obj_text = document.createTextNode("それを計算したいときは代わりに「職固有自己支援・パッシブ持続系」を設定してください");
    obj_td.appendChild(obj_text);
    obj_td.appendChild(document.createElement("br"));
    obj_text = document.createTextNode("この仕様は ");
    obj_td.appendChild(obj_text);
    var objLink = document.createElement("a");
    objLink.setAttribute("href", "https://github.com/roratorio-hub/ratorio/issues/805");
    objLink.setAttribute("target", "_blank");
    objLink.appendChild(document.createTextNode("将来的に変更する予定"));
    obj_td.appendChild(objLink);
    obj_text = document.createTextNode(" があります");
    obj_td.appendChild(obj_text);

    // 設定欄のヘッダ部分をリフレッシュ（着色処理等）
    RefreshSkillColumnHeaderLearned(null, -1, 0);

    // 展開表示しない場合は、ここで処理終了
    if (!n_SkillSWLearned) {
        return;
    }

    // 公式スキルツリーから出力されたURLを読み込む機能
    $(obj_tbody).append(`
		<tr><td colspan="6" style="padding: 3px">
			<div style="display:flex">
				<div style="width:100px;margin:0 0.5em"><button type="button" id="ID_SKILL_LEARNED_LOAD" style="width:100%">URL入力</button></div>
				<div style="width:100%"><input type="text" style="width:100%;height:100%" id="ID_SKILL_LEARNED_URL" placeholder="RO公式ツール「スキルツリー」から出力したURLを貼り付けてください"></div>
				<div style="width:100px;margin:0 0.5em"><button type="button" id="ID_SKILL_LEARNED_URL_CLEAR" style="width:100%" >クリア</button></div>
			</div>
		</td></tr>
	`);
    $(document).off("click", "#ID_SKILL_LEARNED_URL_CLEAR");
    $(document).on("click", "#ID_SKILL_LEARNED_URL_CLEAR", (e) => {
        $("#ID_SKILL_LEARNED_URL").val("");
        $("#ID_SKILL_LEARNED_LOAD").click();
    });
    $(document).off("click", "#ID_SKILL_LEARNED_LOAD");
    $(document).on("click", "#ID_SKILL_LEARNED_LOAD", (e) => {
        let url = location.href;
        try {
            url = new URL($("#ID_SKILL_LEARNED_URL").val() || location.href);
            showLoadingIndicator();
            // 自動再計算を ON にしていると項目変更のたびに計算されて待ち時間がかさむ事があります
            // 待機中を示すスピナーもあるため深刻な問題ではないと認識していますが
            // 問題が表面化した場合には自動再計算の例外処理などを検討してください
            setTimeout(() => {
                $("#ID_SKILL_LEARNED select").each(function (idx, elm) {
                    const id_skill_name = $(elm).attr("id").replace("SELECT", "TD").replace("LEVEL", "NAME");
                    const skill_name = $("#" + id_skill_name).text();
                    const skill = SkillObjNew.filter((d) => d[SKILL_DATA_INDEX_NAME].replace(/\([^)]*\)/g, "").replace(/\<[^>]*\>/g, "") == skill_name)[0];
                    var skill_level = 0
                    if (skill) {
                        skill_level = url.searchParams.get(skill[SKILL_DATA_INDEX_REFID]) || 0;
                    }
                    $(this).val(skill_level).change();
                });
                hideLoadingIndicator();
            }, 0); // ローディングインジケータ表示のために 0 ms後の非同期処理に送る
        } catch (e) { }
    });

    // 設定欄内のスキルテーブルを構築
    let learned_skills = player_job_data["learned_skills"] || [];
    for (var idx = 0; idx < learned_skills.length; idx++) {

        var skill_id = learned_skills[idx]["id"];

        // １行あたり３個のスキル表示とする
        if ((idx % 3) == 0) {
            obj_tr = document.createElement("tr");
            obj_tbody.appendChild(obj_tr);
        }

        // スキル名の表示
        var skill_name = learned_skills[idx]["name"];
        skill_name = skill_name.replace(/\([^)]*\)/g, "");
        skill_name = skill_name.replace(/\<[^>]*\>/g, "");

        var obj_td = document.createElement("td");
        obj_td.setAttribute("id", "OBJID_TD_LEARNED_SKILL_NAME." + skill_id);
        obj_tr.appendChild(obj_td);

        // 習得スキル設定対象でれあば、強調表示クラスに設定
        if (IsLearnedSkillTarget(skill_id)) {
            obj_td.setAttribute("class", "CSSCLS_LEARNED_SKILL_TARGET");
        }

        obj_text = document.createTextNode(skill_name);
        obj_td.appendChild(obj_text);

        // スキルレベル選択部品の構築
        obj_td = document.createElement("td");
        console.log(skill_id);
        obj_td.setAttribute("id", "OBJID_TD_LEARNED_SKILL_LEVEL." + skill_id);
        obj_tr.appendChild(obj_td);

        // 習得スキル設定対象でれあば、強調表示クラスに設定
        if (IsLearnedSkillTarget(skill_id)) {
            obj_td.setAttribute("class", "CSSCLS_LEARNED_SKILL_TARGET");
        }

        var obj_select = document.createElement("select");
        obj_select.setAttribute("id", "OBJID_SELECT_LEARNED_SKILL_LEVEL." + skill_id);
        obj_select.setAttribute("onChange", "LearnedSkill.RefreshSkillColumnHeaderLearned(this, " + skill_id + ", this.value)");
        obj_td.appendChild(obj_select);

        for (var lv = 0; lv <= learned_skills[idx]["max_lv"]; lv++) {
            let obj_option = document.createElement("option");
            obj_option.setAttribute("value", lv);
            if (n_A_LearnedSkill[idx] == lv) {
                obj_option.setAttribute("selected", "selected");
            }
            obj_select.appendChild(obj_option);

            obj_text = document.createTextNode(lv);
            obj_option.appendChild(obj_text);
        }

        // レベルが 0 でなければ、背景色を設定
        if (n_A_LearnedSkill[idx] != 0) {
            obj_select.setAttribute("class", "CSSCLS_SELECTED_LEARNED_SKILL");
        }
    }

}

function IsLearnedSkillTarget(skillId) {

    var idx = 0;
    var itemId = 0;
    var cardId = 0;
    var spidx = 0;

    // 全ての装備を走査し、習得スキル設定対象がないかをチェック
    for (idx = 0; idx < n_A_Equip.length; idx++) {

        itemId = n_A_Equip[idx];

        spidx = ITEM_DATA_INDEX_SPBEGIN;

        while (ItemObjNew[itemId][spidx] != ITEM_SP_END) {
            if (ItemObjNew[itemId][spidx] == ITEM_SP_LEARNED_SKILL_EFFECT) {
                if (ItemObjNew[itemId][spidx + 1] == skillId) {
                    return true;
                }
            }

            spidx += 2;
        }
    }

    // 全てのカードを走査し、習得スキル設定対象がないかをチェック
    for (idx = 0; idx < n_A_card.length; idx++) {

        cardId = n_A_card[idx];

        spidx = CARD_DATA_INDEX_SPBEGIN;

        while (CardObjNew[cardId][spidx] != ITEM_SP_END) {
            if (CardObjNew[cardId][spidx] == ITEM_SP_LEARNED_SKILL_EFFECT) {
                if (CardObjNew[cardId][spidx + 1] == skillId) {
                    return true;
                }
            }

            spidx += 2;
        }
    }

    return false;
}



export function UpdateLearnedSkillSettingColoring() {

    var idx = 0;

    var learnSkillIdArray = null;
    var skillId = 0;
    var objTd = null;


    // 展開表示しない場合は、ここで処理終了
    if (!n_SkillSWLearned) {
        return;
    }

    // 設定欄内のスキルテーブルを走査
    learnSkillIdArray = g_constDataManager.GetDataObject(CONST_DATA_KIND_JOB, n_A_JOB).GetLearnSkillIdArray();

    for (idx = 0; idx < learnSkillIdArray.length; idx++) {

        skillId = learnSkillIdArray[idx];

        // 名称欄
        objTd = document.getElementById("OBJID_TD_LEARNED_SKILL_NAME_" + idx);
        objTd.removeAttribute("class");

        // 習得スキル設定対象でれあば、強調表示クラスに設定
        if (IsLearnedSkillTarget(skillId)) {
            objTd.setAttribute("class", "CSSCLS_LEARNED_SKILL_TARGET");
        }


        // レベル欄
        objTd = document.getElementById("OBJID_TD_LEARNED_SKILL_LEVEL_" + idx);
        objTd.removeAttribute("class");

        // 習得スキル設定対象でれあば、強調表示クラスに設定
        if (IsLearnedSkillTarget(skillId)) {
            objTd.setAttribute("class", "CSSCLS_LEARNED_SKILL_TARGET");
        }


    }

}


/**
 * 習得スキルの変更を反映する
 * @param {*} objSelect
 * @param {*} changedIdx
 * @param {*} newValue
 */
export function RefreshSkillColumnHeaderLearned(objSelect, changedIdx, newValue) {

    if (0 <= changedIdx) {
        n_A_LearnedSkill[changedIdx] = parseInt(newValue);
        Head.AutoCalc("RefreshSkillColumnHeaderLearned");
    }

    // 背景設定
    if (objSelect) {
        if (0 != newValue) {
            objSelect.setAttribute("class", "CSSCLS_SELECTED_LEARNED_SKILL");
        } else {
            objSelect.setAttribute("class", "");
        }
    }

    var sColorCode = "#ddddff";
    var sUsedText = "";
    for (var idx = 0; idx < n_A_LearnedSkill.length; idx++) {
        if (n_A_LearnedSkill[idx] != 0) {
            sColorCode = "#ff7777";
            sUsedText = "　設定中";
            break;
        }
    }
    var objHeader = null;
    var objUsedText = null;
    var objText = null;

    objHeader = document.getElementById("OBJID_SKILL_COLUMN_HEADER_LEARNED");
    objHeader.setAttribute("bgcolor", sColorCode);

    objUsedText = document.getElementById("OBJID_SKILL_COLUMN_USEDTEXT_LEARNED");
    while (objUsedText.firstChild) {
        objUsedText.removeChild(objUsedText.firstChild);
    }
    objText = document.createTextNode(sUsedText);
    objUsedText.appendChild(objText);

}
