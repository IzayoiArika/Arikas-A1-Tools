function OnLoad()
{
	return {
		"providers": ["iat_aqsv"],
		"info": {
			"iat_aqsv": {
				"name": "IATools - 严格可读骤停生成",
				"params": ["基础BPM", "小节线密度", "时间组", "Hold处理策略","使用说明"],
				"params_value": {
					"基础BPM": "",
					"小节线密度": "",
					"时间组": "",
					"Hold处理策略": "",
					"使用说明": "0"
				}
			}
		}
	}
}

function iat_aqsv(base_bpm, bpl, tg, hold_strategy, page) {

	page = page.trim();
	if (page != "") {
		let instr = instruction(parseFloat(page));
		if (instr == "") {
			return "“使用说明”参数非法。";
		}
		return instr;
	}

	base_bpm = parseFloat(base_bpm.trim());
	if (isNaN(base_bpm)) {
		let adeproject = GetCurrentProject();
		base_bpm = adeproject.BaseBpm;
	}
	if (base_bpm <= 0) return "基础BPM值非法。";

	bpl = parseFloat(bpl.trim());
	if (isNaN(bpl)) bpl = 64.00;

	tg = parseFloat(tg.trim());
	if (!Number.isInteger(tg) || tg < 0) tg = 0;

	switch (hold_strategy.trim()) {
		case "head":
			hold_strategy = 1;
			break;
		case "both":
		default:
			hold_strategy = 2;
			break;
	}

    let notes = GetSelectedNotes();
    let timestamps = [];

    for (let j = 0; j < notes.length; j++) {
		let note = notes[j];
		if (note instanceof ArcArc) {
			return "由于Arc不允许跨越Timing，严格骤停变速中不允许含有任何Arc。";
		}
        let timing = note.Timing;
        if (!timestamps.includes(timing)) {
            timestamps.push(timing);
        }
		if (note instanceof ArcHold && hold_strategy == 2) {
			let end_timing = note.endTiming;
			if (!timestamps.includes(end_timing)) {
				timestamps.push(end_timing);
			}
		}
    }

    if (timestamps.length <= 1) {
        return "至少需选择两时间不同的物件。";
    }

    timestamps.sort((a, b) => a - b);

    for (let i = 1; i < timestamps.length; i++) {
        let startTiming = new ArcTiming();
        startTiming.Timing = timestamps[i - 1];
        startTiming.Bpm = 0;
        startTiming.BeatsPerLine = bpl;
        startTiming.TimingGroup = tg;
        AddArcEvent(startTiming);

        let endTiming = new ArcTiming();
        endTiming.Timing = timestamps[i] - 1;
        endTiming.Bpm = base_bpm * (timestamps[i] - timestamps[i - 1]);
        endTiming.BeatsPerLine = bpl;
        endTiming.TimingGroup = tg;
        AddArcEvent(endTiming);
    }

    let finalTiming = new ArcTiming();
    finalTiming.Timing = timestamps[timestamps.length - 1];
    finalTiming.Bpm = base_bpm;
    finalTiming.BeatsPerLine = bpl;
    finalTiming.TimingGroup = tg;
    AddArcEvent(finalTiming);

	let res_str = "执行完成，变速应当已生成至时间组" + String(tg) + "。";
	if (tg != 0) {
		res_str += "\n推荐将变速置于默认时间组（0）中，利用小节线作为提示。";
	}

    return res_str;
}

function instruction(page) {
	switch (page) {
		case 0:
			return  "本工具用于便捷生成严格可读骤停变速。\n" + 
					"选中一段谱面后填入对应参数，然后执行本工具即可。\n" + 
					"请注意：由于Arc不允许跨越timing，所以请确保选中的物件只含有Tap和Hold。\n\n" + 

					"留空“使用说明”参数后即可执行本工具。\n" + 
					"输入参数编号（从1开始，从上至下依次+1）并执行，可查询对应参数的详细说明。\n" + 
					"再次查看本说明可将“使用说明”参数填为0后执行。\n\n" + 

					"接收数字参数时使用IEEE 754双精度浮点数，因此传入过大的数可能导致精度丢失。\n\n" + 

					"本工具由IzayoiArika编写，转发时请保留本句署名。";
		case 1:
			return  "- 基础BPM\n\n" + 

					"> 解释\n" + 
					"添加变速后物件的距离 等同于 使用基础BPM的timing且不添加变速的距离。\n" + 
					"※ 不总是需要与谱面的当前BPM等同。\n" + 
					"※ 为了更好地展示后面的物件，可酌情调整。\n\n" + 

					"> 要求\n" + 
					"正实数。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n" + 
					"※ 如默认值仍非法则拒绝执行。\n\n" + 

					"> 默认值\n" + 
					"当前谱面的Base BPM，即Arcade顶栏“基础BPM”的值。\n" + 
					"部分Arcade在某些情况下无法正确读取基础BPM，会导致默认值也为非法值。"
		case 2:
			return  "- 小节线密度\n\n" + 

					"> 解释\n" + 
					"控制所有变速的小节线密度，即timing第三参数的值。\n" + 
					"※ 为防止小节线过度叠加，建议设置为较大的值。\n\n" + 

					"> 要求\n" + 
					"正实数。\n" + 
					"※ 无论输入为何，最终必然保存为两位定点小数。\n\n" + 

					"> 非法处理\n" + 
					"接收的参数非法时采用默认值。\n\n" + 

					"> 默认值\n" + 
					"64.00。";
		case 3:
			return  "- 时间组\n\n" + 

					"> 解释\n" + 
					"变速使用的所有timing将生成至指定编号的时间组。\n" + 
					"※ 请确保选中的物件全部在这个时间组内。\n\n" + 

					"> 要求\n" + 
					"自然数。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"0，指向默认时间组。\n\n" + 

					"> 特别提醒\n" + 
					"由于未提供相应API，本工具无法检查数字对应的时间组是否真实存在。\n" + 
					"请在执行工具前自行确认时间组编号有效。";
		case 4:
			return  "- Hold处理策略\n\n" + 

					"> 解释\n" + 
					"根据该参数，在处理Hold时采取不同变速方案。\n\n" + 

					"> 要求\n" + 
					"只接受以下值的一个：head, both。\n" + 
					"采用head模式时，变速只考虑Hold的头部。该模式要求Hold的结束时间必须和下一物件的（开始）时间完全相同。\n" + 
					"采用both模式时，变速会同时考虑Hold的头尾部。该模式对Hold的结束时间无要求。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"both。"
		case 5:
			return  "- 使用说明\n\n" + 

					"> 解释\n" + 
					"根据参数编号，查询对应参数的详细说明。\n" + 
					"特别的：值为0时返回工具概述；留空时执行工具的实际功能。\n\n" + 

					"> 要求\n" + 
					"只接受以下值或留空：0, 1, 2, 3, 4, 5。\n\n" + 

					"> 非法处理\n" + 
					"拒绝执行。";
		default:
			return "";
	}
}