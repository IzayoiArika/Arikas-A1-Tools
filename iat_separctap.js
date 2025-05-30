
function OnLoad()
{
	return {
		"providers": ["iat_separctap"],
		"info": {
			"iat_separctap": {
				"name": "IATools - 分离Arctap",
				"params": ["原物件处理方式", "使用说明"],
				"params_value": {
					"原物件处理方式": "",
					"使用说明": "0"
				}
			}
		}
	}
}

function iat_separctap(od_type, page) {
	
	page = page.trim();
	if (page != "") {
		let instr = instruction_spat(parseFloat(page));
		if (instr == "") {
			return "“使用说明”参数非法。";
		}
		return instr;
	}

	let notes = GetSelectedNotes();
	if (notes.length < 1) return "请选择要剥离Arctap的黑线。";

	od_type = od_type.trim();
	switch (od_type) {
		case "preserve":
		case "delete":
			break;
		default:
			od_type = "preserve";
	}

	let trace_pool = [];
	for (let i = 0; i < notes.length; i++) {
	    let note = notes[i];
	    if (note instanceof ArcArc && note.IsVoid && note.ArcTaps.count != 0) {
			trace_pool.push(note);
		}
	}

	if (trace_pool.length < 1) return "请选择要剥离Arctap的黑线。";

	for (let i = 0; i < trace_pool.length; i++) {
		let trace = trace_pool[i];
		let traceLen = trace.EndTiming - trace.Timing;
		
		let xEasing = ALT2EasingX(trace.LineType);
		let yEasing = ALT2EasingY(trace.LineType);

		for (let ai = 0; ai < trace.ArcTaps.count; ai++) {
			let arc_ai = new ArcArc();
			arc_ai.LineType = ArcLineType.S;
			arc_ai.Timing = trace.ArcTaps[ai].Timing;
			arc_ai.EndTiming = trace.ArcTaps[ai].Timing + 1;
			arc_ai.Color = trace.Color;
			arc_ai.IsVoid = true;
			arc_ai.TimingGroup = trace.TimingGroup;

			let p = (trace.ArcTaps[ai].Timing - trace.Timing) / traceLen;
			arc_ai.XStart = arc_ai.XEnd = Ease.Easing(xEasing, trace.XStart, trace.XEnd, p);
			arc_ai.YStart = arc_ai.YEnd = Ease.Easing(yEasing, trace.YStart, trace.YEnd, p);
			AddArcEvent(arc_ai);

			let at = new ArcArcTap();
			at.Timing = trace.ArcTaps[ai].Timing;
		    AddArcTap(arc_ai, at);
		}
		if (od_type == "preserve") {
			let new_trace = new ArcArc();
			new_trace.LineType = trace.LineType;
			new_trace.Timing = trace.Timing;
			new_trace.EndTiming = trace.EndTiming;
			new_trace.Color = trace.Color;
			new_trace.IsVoid = trace.IsVoid;
			new_trace.TimingGroup = trace.TimingGroup;
			new_trace.XStart = trace.XStart;
			new_trace.XEnd = trace.XEnd;
			new_trace.YStart = trace.YStart;
			new_trace.YEnd = trace.YEnd;
			AddArcEvent(new_trace);
		}
		RemoveArcEvent(trace);
	}

	return "执行完成。";
}

function ALT2EasingY(type) {
	switch (type) {
		case ArcLineType.B:
			return "InOutSine";
		case ArcLineType.SiSi:
		case ArcLineType.SoSi:
			return "OutSine";
		case ArcLineType.SoSo:
		case ArcLineType.SiSo:
			return "InSine";
		default:
			return "Linear";
	}
}

function ALT2EasingX(type) {
	switch (type) {
		case ArcLineType.B:
			return "InOutSine";
		case ArcLineType.Si:
		case ArcLineType.SiSi:
		case ArcLineType.SiSo:
			return "OutSine";
		case ArcLineType.So:
		case ArcLineType.SoSo:
		case ArcLineType.SoSi:
			return "InSine";
		default:
			return "Linear";
	}
}

function instruction_spat(page) {
	switch (page) {
		case 0:
			return  "本工具用于把Arctap从黑线上剥离。\n" + 
					"选中数个黑线后执行本工具即可。\n" + 
					"工具会自动跳过Tap、Hold、蛇和无Arctap的黑线，不必手动取消选中。\n\n" + 

					"留空“使用说明”参数后即可执行本工具。\n" + 
					"输入参数编号（从1开始，从上至下依次+1）并执行，可查询对应参数的详细说明。\n" + 
					"再次查看本说明可将“使用说明”参数填为0后执行。\n\n" + 

					"本工具由IzayoiArika编写，转发时请保留本句署名。";
		case 1:
			return  "- 原物件处理方式\n\n" + 

					"> 解释\n" + 
					"分离Arctap后，原黑线的处理方式。\n\n" + 

					"> 要求\n" + 
					"只接受以下值的一个：preserve, delete。\n" + 
					"采用preserve类型时，执行后保留原黑线。\n" + 
					"采用delete类型时，执行后删除原黑线。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"preserve。";
		case 2:
			return  "- 使用说明\n\n" + 

					"> 解释\n" + 
					"根据参数编号，查询对应参数的详细说明。\n" + 
					"特别的：值为0时返回工具概述；留空时执行工具的实际功能。\n\n" + 

					"> 要求\n" + 
					"只接受以下值或留空：0, 1, 2。\n\n" + 

					"> 非法处理\n" + 
					"拒绝执行。";
		default:
			return "";
	}
}