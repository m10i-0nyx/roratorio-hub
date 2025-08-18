/**
 * 習得スキル欄の生成・更新・サーチなどの関数群
 */
let n_SkillSWLearned = false;
LEARNED_SKILL_MAX_COUNT = 200;
n_A_LearnedSkill = new Array();
for (let dmyidx = 0; dmyidx < LEARNED_SKILL_MAX_COUNT; dmyidx++) {
	n_A_LearnedSkill[dmyidx] = 0;
}

/**
 * 任意の習得スキルに設定されているスキルLvを取得する
 * @param {Number|String} requestId 取得したいスキルID or MigIdNum
 * @returns {Number} スキルLv
 */
function LearnedSkillSearch(requestId) {
	let skillId = null;
	if (typeof requestId == "number") {
		skillId = SkillMap.getIdByMigIdNum(requestId);
	} else if (typeof requestId == "string" && SkillMap.existsById(requestId)) {
		skillId = requestId;
	}
	if (skillId !== undefined && skillId !== null) {
		// 指定されたスキルIDが見つかったとき
		const skillLvElement = document.querySelector(`select[data-skill-id=${skillId}]`);
		if (skillLvElement) {
			return parseInt(skillLvElement.value);
		}
	}
	// スキルIDが見つからなかったり想定外の値が設定されている場合は0を返す
	return 0;
}

/**
 * 習得スキル欄を生成する
 * @returns 
 */
function OnClickSkillSWLearned(){
	let objSW = null;
	let objRoot = null;
	let objTable = null;
	let objTbody = null;
	let objTr = null;
	let objTd = null;
	let objInput = null;
	let objText = null;
	let objSpan = null;
	let objLabel = null;
	let objOption = null;

	// チェックボックスのチェック状態を取得
	n_SkillSWLearned = false;
	objSW = document.getElementById("OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX");
	if (objSW) {
		n_SkillSWLearned = objSW.checked;
	}

	// 設定欄を初期化
	objRoot = document.getElementById("ID_SKILL_LEARNED");
	while (objRoot.firstChild) {
		objRoot.removeChild(objRoot.firstChild);
	}

	// 設定欄テーブルを再構築
	objTable = document.createElement("table");
	objTable.setAttribute("border", 1);
	objRoot.appendChild(objTable);

	objTbody = document.createElement("tbody");
	objTable.appendChild(objTbody);

	// 設定欄のヘッダ部分を構築
	objTr = document.createElement("tr");
	objTbody.appendChild(objTr);

	objTd = document.createElement("td");
	objTd.setAttribute("id", "OBJID_SKILL_COLUMN_HEADER_LEARNED");
	objTd.setAttribute("class", "title");
	objTd.setAttribute("colspan", 6);
	objTr.appendChild(objTd);

	// 設定欄展開用チェックボックス
	objInput = document.createElement("input");
	objInput.setAttribute("type", "checkbox");
	objInput.setAttribute("id", "OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX");
	objInput.setAttribute("onClick", "OnClickSkillSWLearned()");
	if (n_SkillSWLearned) {
		// 部品を再構築しているので、チェック状態の再設定が必要
		objInput.setAttribute("checked", "checked");
	}
	objTd.appendChild(objInput);

	objLabel = HtmlCreateElement("label", objTd);
	objLabel.setAttribute("for", "OBJID_SKILL_COLUMN_EXTRACT_CHECKBOX");
	HtmlCreateTextNode("習得スキル", objLabel);

	objSpan = document.createElement("span");
	objSpan.setAttribute("id", "OBJID_SKILL_COLUMN_USEDTEXT_LEARNED");
	objTd.appendChild(objSpan);

	objText = document.createTextNode("　　");
	objTd.appendChild(objText);

	// 習得済みスキルを発動条件に持つ装備のアノテーション
	objSpan = document.createElement("span");
	objSpan.setAttribute("id", "ID_SKILL_LEARNED_NOTICE");
	objSpan.setAttribute("style", "color : red");
	objTd.appendChild(objSpan);
	UpdateLearnedSkillNotice();

	// 設定欄のヘッダ部分をリフレッシュ（着色処理等）
	RefreshSkillColumnHeaderLearned(null, -1, 0);
	// 展開表示しない場合は、ここで処理終了
	if (!n_SkillSWLearned) {
		return;
	}
	// 公式スキルツリーから出力されたURLを読み込む機能 
	$(objTbody).append(`
		<tr><td colspan="6" style="padding: 3px">
			<div style="display:flex">
				<div style="width:100px;margin:0 0.5em"><button type="button" id="ID_SKILL_LEARNED_LOAD" style="width:100%">URL入力</button></div>
				<div style="width:100%"><input type="text" style="width:100%;height:100%" id="ID_SKILL_LEARNED_URL" placeholder="RO公式ツール「スキルツリー」から出力したURLを貼り付けてください"></div>
				<div style="width:100px;margin:0 0.5em"><button type="button" id="ID_SKILL_LEARNED_URL_CLEAR" style="width:100%" >クリア</button></div>
			</div>
		</td></tr>
	`);
	$(document).off("click","#ID_SKILL_LEARNED_URL_CLEAR");
	$(document).on("click","#ID_SKILL_LEARNED_URL_CLEAR", (e)=>{
		$("#ID_SKILL_LEARNED_URL").val("");
		$("#ID_SKILL_LEARNED_LOAD").click();
	});
	$(document).off("click","#ID_SKILL_LEARNED_LOAD");
	$(document).on("click","#ID_SKILL_LEARNED_LOAD", (e)=>{
		try{
			const url = new URL(document.getElementById("ID_SKILL_LEARNED_URL").value || location.href);
			showLoadingIndicator();
			// 自動再計算を ON にしていると項目変更のたびに計算されて待ち時間がかさむ事があります
			// 待機中を示すスピナーもあるため深刻な問題ではないと認識していますが
			// 問題が表面化した場合には自動再計算の例外処理などを検討してください
			setTimeout(() => {
				const event = new Event('change', { bubbles: true });
				url.searchParams.forEach((skillLv, skillId) => {
					const skillLvElement = document.querySelector(`select[data-skill-id=${skillId}]`);
					if (skillLvElement) {
						skillLvElement.value = skillLv.toString();
						skillLvElement.dispatchEvent(event);
					}
				});
				hideLoadingIndicator();
			},0); // ローディングインジケータ表示のために 0 ms後の非同期処理に送る
		} catch(e) {}
	});

	let jobId = null;
	const selectJobElem = document.getElementById("OBJID_SELECT_JOB");
	if (selectJobElem) {
		jobId = selectJobElem.value;
	}
	// 職業IDが確定したら、ジョブデータを取得
	let jobData = JobMap.getById(jobId);

	// 設定欄内のスキルテーブルを構築
	const learnSkillIdList = jobData.getLearnSkillIdList();
	Object.values(learnSkillIdList).forEach((skillId, idx) => {
		// スキルIDからスキルデータを取得
		const skillData = SkillMap.getById(skillId);
		if (!skillData) { 
			console.log(`Skill ID: ${skillId} not found`);
			return;
		}
		// スキル名を取得
		const skillName = skillData.getName();
		// スキル最大レベルを取得
		const skillMaxLv = skillData.getMaxLv();
		// MigIdNumを取得
		const skillMigId = skillData.getMidIdNum();

		// スキル名とレベルを表示
		//console.debug(`Idx: ${idx}, 習得スキル: ${skillName}, Maxレベル: ${skillMaxLv}, MigIdNum: ${skillMigId}`);

		if ((idx % 3) == 0) {
			objTr = document.createElement("tr");
			objTbody.appendChild(objTr);
		}

		var objTd = document.createElement("td");
		objTd.setAttribute("id", "OBJID_TD_LEARNED_SKILL_NAME_" + idx);
		objTr.appendChild(objTd);

		// 習得スキル設定対象でれあば、強調表示クラスに設定
		if (IsLearnedSkillTarget(skillMigId)) {
			objTd.setAttribute("class", "CSSCLS_LEARNED_SKILL_TARGET");
		}

		objText = document.createTextNode(skillName);
		objTd.appendChild(objText);

		// スキルレベル選択部品の構築
		var objTd = document.createElement("td");
		objTd.setAttribute("id", "OBJID_TD_LEARNED_SKILL_LEVEL_" + idx);
		objTr.appendChild(objTd);

		// 習得スキル設定対象でれあば、強調表示クラスに設定
		if (IsLearnedSkillTarget(skillMigId)) {
			objTd.setAttribute("class", "CSSCLS_LEARNED_SKILL_TARGET");
		}

		var objSelect = document.createElement("select");
		objSelect.setAttribute("id", "OBJID_SELECT_LEARNED_SKILL_LEVEL_" + idx);
		objSelect.setAttribute("data-skill-id", skillId);
		objSelect.setAttribute("onChange", "RefreshSkillColumnHeaderLearned(this, " + idx + ", this.value)");
		objTd.appendChild(objSelect);
		for (let lv = 0; lv <= skillMaxLv; lv++) {
			objOption = document.createElement("option");
			objOption.setAttribute("value", lv);
			if (n_A_LearnedSkill[idx] == lv) {
				objOption.setAttribute("selected", "selected");
			}
			objSelect.appendChild(objOption);
			objText = document.createTextNode(lv);
			objOption.appendChild(objText);
		}
		// レベルが 0 でなければ、背景色を設定
		if (n_A_LearnedSkill[idx] != 0) {
			objSelect.setAttribute("class", "CSSCLS_SELECTED_LEARNED_SKILL");
		}
	});
}

/**
 * 習得スキルをトリガーとするアイテムを装備しているか検査する
 * @param {Number} skillMigId
 * @returns {boolean} true:装備している / false:装備していない
 */
function IsLearnedSkillTarget (skillMigId) {
	let idx = 0;
	let itemId = 0;
	let cardId = 0;
	let spidx = 0;
	// 全ての装備を走査し、習得スキル設定対象がないかをチェック
	for (idx = 0; idx < n_A_Equip.length; idx++) {
		itemId = n_A_Equip[idx];
		spidx = ITEM_DATA_INDEX_SPBEGIN;
		while (ItemObjNew[itemId][spidx] != ITEM_SP_END) {
			if (ItemObjNew[itemId][spidx] == ITEM_SP_LEARNED_SKILL_EFFECT) {
				if (ItemObjNew[itemId][spidx + 1] == skillMigId) {
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
				if (CardObjNew[cardId][spidx + 1] == skillMigId) {
					return true;
				}
			}

			spidx += 2;
		}
	}
	return false;
}

/**
 * トリガー条件になっている習得スキルを強調表示する
 * 判定関数として内部でIsLearnedSkillTargetを呼び出す
 * @returns
 */
function UpdateLearnedSkillSettingColoring() {
	// 展開表示しない場合は、ここで処理終了
	if (!n_SkillSWLearned) {
		return;
	}

	let jobId = null;
	const selectJobElem = document.getElementById("OBJID_SELECT_JOB");
	if (selectJobElem) {
		jobId = selectJobElem.value;
	}
	// 職業IDが確定したら、ジョブデータを取得
	let jobData = JobMap.getById(jobId);

	// 設定欄内のスキルテーブルを走査
	const learnSkillIdList = jobData.getLearnSkillIdList();
	Object.values(learnSkillIdList).forEach((skillId, idx) => {
		// スキルIDからスキルデータを取得
		const skillData = SkillMap.getById(skillId);
		if (!skillData) {
			return;
		}
		// MigIdNumを取得
		const skillMigId = skillData.getMidIdNum();

		// 名称欄
		var objTd = document.getElementById("OBJID_TD_LEARNED_SKILL_NAME_" + idx);
		objTd.removeAttribute("class");
		// 習得スキル設定対象でれあば、強調表示クラスに設定
		if (IsLearnedSkillTarget(skillMigId)) {
			objTd.setAttribute("class", "CSSCLS_LEARNED_SKILL_TARGET");
		}
		// レベル欄
		var objTd = document.getElementById("OBJID_TD_LEARNED_SKILL_LEVEL_" + idx);
		objTd.removeAttribute("class");
		// 習得スキル設定対象でれあば、強調表示クラスに設定
		if (IsLearnedSkillTarget(skillMigId)) {
			objTd.setAttribute("class", "CSSCLS_LEARNED_SKILL_TARGET");
		}
	});
}

/**
 * 習得スキルの変更を反映する
 * @param {*} objSelect
 * @param {*} changedIdx
 * @param {*} newValue
 */
function RefreshSkillColumnHeaderLearned(objSelect, changedIdx, newValue) {
	if (0 <= changedIdx) {
		n_A_LearnedSkill[changedIdx] = parseInt(newValue);
		AutoCalc("RefreshSkillColumnHeaderLearned");
	}
	// 背景設定
	if (objSelect) {
		if (0 != newValue) {
			objSelect.setAttribute("class", "CSSCLS_SELECTED_LEARNED_SKILL");
		} else {
			objSelect.setAttribute("class", "");
		}
	}
	let sColorCode = "#ddddff";
	let sUsedText = "";
	for (let idx = 0; idx < n_A_LearnedSkill.length; idx++) {
		if (n_A_LearnedSkill[idx] != 0) {
			sColorCode = "#ff7777";
			sUsedText = "　設定中";
			break;
		}
	}
	let objHeader = null;
	let objUsedText = null;
	let objText = null;
	objHeader = document.getElementById("OBJID_SKILL_COLUMN_HEADER_LEARNED");
	objHeader.setAttribute("bgcolor", sColorCode);
	objUsedText = document.getElementById("OBJID_SKILL_COLUMN_USEDTEXT_LEARNED");
	while (objUsedText.firstChild) {
		objUsedText.removeChild(objUsedText.firstChild);
	}
	objText = document.createTextNode(sUsedText);
	objUsedText.appendChild(objText);
}
