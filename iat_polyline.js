function OnLoad()
{
	return {
		"providers": ["iat_polyline"],
		"info": {
			"iat_polyline": {
				"name": "IATools - 折线生成",
				"params": ["分割方式", "折线类型", "原物件处理方式", "使用说明"],
				"params_value": {
					"分割方式": "4",
					"折线类型": "",
					"原物件处理方式": "",
					"使用说明": "0"
				}
			}
		}
	}
}

function iat_polyline(division, pl_type, od_type, page) {

	page = page.trim();
	if (page != "") {
		let instr = instruction(parseFloat(page));
		if (instr == "") {
			return "“使用说明”参数非法。";
		}
		return instr;
	}

	pl_type = pl_type.trim();
	switch (pl_type) {
		case "normal":
		case "parallel":
		case "rectangle":
			break;
		default:
			pl_type = "normal";
	}

	od_type = od_type.trim();
	switch (od_type) {
		case "delete_both":
		case "delete_base":
		case "delete_aux":
		case "preserve":
			break;
		default:
			od_type = "preserve";
	}

	let notes = GetSelectedNotes();
	if (notes.length != 2) return "请选择两个Arc。";

	let base = notes[0], aux = notes[1];
	if (!(base instanceof ArcArc) || !(aux instanceof ArcArc))
	    return "请确保选择的两个物件均为Arc。";

	let begin = (base.Timing > aux.Timing ? base.Timing : aux.Timing);
	let end = (base.EndTiming < aux.EndTiming ? base.EndTiming : aux.EndTiming);
	if (begin >= end) return "所选的两个Arc无重叠区间。";
	
	let points = SplitStr2Points(division.trim(), begin, end);
	if (points == []) {
		return "分割方式非法。";
	}

	let baseXEasing = ALT2EasingX(base.LineType);
	let baseYEasing = ALT2EasingY(base.LineType);
	let auxXEasing = ALT2EasingX(aux.LineType);
	let auxYEasing = ALT2EasingY(aux.LineType);
	let baseLen = base.EndTiming - base.Timing;
	let auxLen = aux.EndTiming - aux.Timing;

	for (let i = 1; i < points.length; i++) {
		let p_prev = points[i - 1];
    	let p_current = points[i];
    	
    	let arc = new ArcArc();
    	arc.LineType = ArcLineType.S;
    	arc.Timing = p_prev;
    	arc.EndTiming = p_current;
    	arc.Color = base.Color;
    	arc.IsVoid = base.IsVoid;
    	arc.TimingGroup = base.TimingGroup;
    	
    	//Type 1: normal eg. Aegleseeker
    	if (pl_type == "normal") {
    		if (i % 2) {
				let pc_start = (p_prev - base.Timing) / baseLen;
				let pc_end = (p_current - aux.Timing) / auxLen;

    		    arc.XStart = Ease.Easing(baseXEasing, base.XStart, base.XEnd, pc_start);
        		arc.YStart = Ease.Easing(baseYEasing, base.YStart, base.YEnd, pc_start);
        		arc.XEnd = Ease.Easing(auxXEasing, aux.XStart, aux.XEnd, pc_end);
        		arc.YEnd = Ease.Easing(auxYEasing, aux.YStart, aux.YEnd, pc_end);
    		}
    		else {
				let pc_start = (p_prev - aux.Timing) / auxLen;
				let pc_end = (p_current - base.Timing) / baseLen;

        		arc.XStart = Ease.Easing(auxXEasing, aux.XStart, aux.XEnd, pc_start);
        		arc.YStart = Ease.Easing(auxYEasing, aux.YStart, aux.YEnd, pc_start);
        		arc.XEnd = Ease.Easing(baseXEasing, base.XStart, base.XEnd, pc_end);
        		arc.YEnd = Ease.Easing(baseYEasing, base.YStart, base.YEnd, pc_end);
    		}
    	    AddArcEvent(arc);
    	}
    	else if (pl_type == "parallel" || pl_type == "rectangle") {
			let pc_start = (p_prev - base.Timing) / baseLen;
			let pc_end = (p_current - aux.Timing) / auxLen;

        	//Type 2: eg. 7thSense
    	    arc.XStart = Ease.Easing(baseXEasing, base.XStart, base.XEnd, pc_start);
    		arc.YStart = Ease.Easing(baseYEasing, base.YStart, base.YEnd, pc_start);
    		arc.XEnd = Ease.Easing(auxXEasing, aux.XStart, aux.XEnd, pc_end);
    		arc.YEnd = Ease.Easing(auxYEasing, aux.YStart, aux.YEnd, pc_end);
    		AddArcEvent(arc);
        	if (pl_type == "parallel") continue;

        	//Type 3: eg. World Ender
			let pc_end2 = (p_current - base.Timing) / baseLen;
        	let arclnk = new ArcArc();
        	arclnk.LineType = ArcLineType.S;
            arclnk.Timing = arclnk.EndTiming = p_current;
            arclnk.Color = base.Color;
            arclnk.IsVoid = base.IsVoid;
            arclnk.TimingGroup = base.TimingGroup;

            arclnk.XStart = Ease.Easing(auxXEasing, aux.XStart, aux.XEnd, pc_end);
            arclnk.YStart = Ease.Easing(auxYEasing, aux.YStart, aux.YEnd, pc_end);
            arclnk.XEnd = Ease.Easing(baseXEasing, base.XStart, base.XEnd, pc_end2);
            arclnk.YEnd = Ease.Easing(baseYEasing, base.YStart, base.YEnd, pc_end2);
            AddArcEvent(arclnk);
    	}
    	else return "类型不正确，请查看帮助文档。";
	}
	if (od_type == "delete_both" || od_type == "delete_base") {
		RemoveArcEvent(base);
	}
	if (od_type == "delete_both" || od_type == "delete_aux") {
		RemoveArcEvent(aux);
	}
}

function SplitStr2Points(str, begin, end) {
	if (str == "") return [];

	let points = [begin];
	let substrs = str.split(/\+/)
	let current = begin;

	for (let i = 0; i < substrs.length; i++) {

		let substr = substrs[i].trim();

		if (substr == "") return [];
		else if (substr.search(/\*/) == -1) {
			// 子字符串：n

			let n = parseFloat(substr);

			if (isNaN(n) || !Number.isInteger(n) || n <= 0) return [];

			let rest = end - current;
			for (let j = 1; j <= n; j++) {
				points.push(current + j * rest / n);
			}
			return points;
		}
		else {
			// 子字符串：t*n

			let subsubstrs = substr.split(/\*/);
			if (subsubstrs.length != 2) return [];
			let t = parseFloat(subsubstrs[0].trim());
			let n = parseFloat(subsubstrs[1].trim());

			if (isNaN(t) || isNaN(n) || !Number.isInteger(n) || n <= 0 || t <= 0) return [];

			for (let j = 0; j < n; j++) {
				current += t;
				if (current >= end) {
					points.push(end);
                    return points;
				}
				points.push(current);
			}
		}
	}
	if (current < end) {
		points.push(end);
	}
	return points;
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

function instruction(page) {
	switch (page) {
		case 0:
			return  "本工具用于便捷生成折线蛇。\n" + 
					"先后选中两条蛇，第一条为主蛇，第二条为辅助蛇，然后填入对应参数，最后执行本工具即可。\n" + 
					"生成的折线蛇将位于主蛇和辅助蛇的时间交集区间内。\n\n" + 

					"留空“使用说明”参数后即可执行本工具。\n" + 
					"输入参数编号（从1开始，从上至下依次+1）并执行，可查询对应参数的详细说明。\n" + 
					"再次查看本说明可将“使用说明”参数填为0后执行。\n\n" + 

					"接收数字参数时使用IEEE 754双精度浮点数，因此传入过大的数可能导致精度丢失。\n\n" + 

					"本工具由IzayoiArika编写，转发时请保留本句署名。";
		case 1:
			return  "- 分割方式\n\n" + 

					"> 解释\n" + 
					"切割折线蛇时，会根据此参数来决定时间上如何切割。\n\n" + 

					"> 要求\n" + 
					"用+分割的若干子字符串。子字符串可以为以下几种：\n" +  
					"t*n：切出n段时长为t ms的小片段。\n" + 
					"n：把剩余的部分平均切割为n段。\n" +
					"例如切割一段长1140ms的蛇，则\"120*7+5\"表示蛇被：\n" + 
					"- 切成7+5=12段；\n" + 
					"- 前7段为120ms；\n" + 
					"- 耗去120*7=840ms，剩1140-840=300ms；\n" + 
					"- 剩余长度均分为5份（每份60ms）。\n" + 
					"分割时按字符串的要求从左到右分割。\n" + 
					"如果已经无法按给定要求进行分割，则立即终止，但此前的切割正常进行。\n" + 
					"如果分割后仍有剩余，则剩余部分独立成段。\n\n" + 

					"> 非法处理\n" + 
					"拒绝执行。"
		case 2:
			return  "- 连接类型\n\n" + 

					"> 解释\n" + 
					"折线的连接方式。\n\n" + 

					"> 要求\n" + 
					"只接受以下值的一个：normal, parallel, rectangle。\n" + 
					"采用normal类型时，折线的第一段先从主蛇走向辅助蛇，然后在下一段再走回来，再下一段又走回去，循环往复。\n" + 
					"采用parallel类型时，折线的每一段都从主蛇走向辅助蛇，呈现为数段独立的直蛇。\n" + 
					"采用rectangle类型时，折线的每一段都从主蛇走向辅助蛇，然后立即通过一个直角蛇回到主蛇。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"normal。";
		case 3:
			return  "- 原物件处理方式\n\n" + 

					"> 解释\n" + 
					"折线生成后，原物件的处理方式。\n\n" + 

					"> 要求\n" + 
					"只接受以下值的一个：preserve, delete_aux, delete_base, delete_both。\n" + 
					"采用preserve类型时，主蛇和辅助蛇均保留。\n" + 
					"采用delete_aux类型时，删除辅助蛇，保留主蛇。\n" + 
					"采用delete_base类型时，删除主蛇，保留辅助蛇。\n" + 
					"采用delete_both类型时，主蛇和辅助蛇均删除。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"preserve。";
		case 4:
			return  "- 使用说明\n\n" + 

					"> 解释\n" + 
					"根据参数编号，查询对应参数的详细说明。\n" + 
					"特别的：值为0时返回工具概述；留空时执行工具的实际功能。\n\n" + 

					"> 要求\n" + 
					"只接受以下值或留空：0, 1, 2, 3, 4。\n\n" + 

					"> 非法处理\n" + 
					"拒绝执行。";
	}
}