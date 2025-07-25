function OnLoad()
{
	return {
		"providers": ["iat_arcbezier_cutter"],
		"info": {
			"iat_arcbezier_cutter": {
				"name": "IATools - 切蛇工具 - 贝塞尔",
				"params": ["X方向贝塞尔曲线参数", "Y方向贝塞尔曲线参数", "分割方式", "切割样式", "使用说明"],
				"params_value": {
					"X方向贝塞尔曲线参数": "0.25, 0.1, 0.25, 1",
					"Y方向贝塞尔曲线参数": "0.25, 0.1, 0.25, 1",
					"分割方式": "4",
					"切割样式": "",
					"使用说明": "0"
				}
			}
		}
	}
}

function iat_arcbezier_cutter(x_bezier, y_bezier, division, pttrn_str, page) {

	page = page.trim();
	if (page != "") {
		let instr = instruction_acbz(parseFloat(page));
		if (instr == "") {
			return "“使用说明”参数非法。";
		}
		return instr;
	}

	pttrn_str = pttrn_str.trim();
	let pattern = parsePttrn(pttrn_str);
	if (pattern == pttrn.invalid) {
		return "切割样式非法。";
	}

	x_bezier = x_bezier.trim();
	let x_bezier_arr = [];
	if (x_bezier != "") {
		x_bezier_arr = parseBezier(x_bezier);
		if (x_bezier_arr.length == 0) return "贝塞尔曲线参数非法。";
	}

	y_bezier = y_bezier.trim();
	let y_bezier_arr = [];
	if (y_bezier != "") {
		y_bezier_arr = parseBezier(y_bezier);
		if (y_bezier_arr.length == 0) return "贝塞尔曲线参数非法。";
	}

	let notes = GetSelectedNotes();
	let arcs = [];
	for (let i = 0; i < notes.length; i++) {
		if (notes[i] instanceof ArcArc) {
			arcs.push(notes[i]);
		}
	}
	if (arcs.length == 0) return "请选择至少一个Arc。";
	
	let arc_pool = [];
	let arc_lnk_pool = [];

	for (let i = 0; i < arcs.length; i++) {

		let arc_old = arcs[i];

		let xEasingBezier = [];
		if (x_bezier_arr != []) {
			xEasingBezier = x_bezier_arr;
		}
		else {
			xEasingBezier = ALT2BezierX(arc_old.LineType);
		}

		let yEasingBezier = [];
		if (y_bezier_arr != []) {
			yEasingBezier = y_bezier_arr;
		}
		else {
			yEasingBezier = ALT2BezierY(arc_old.LineType);
		}

		let points = SplitStr2Points(division.trim(), arc_old.Timing, arc_old.EndTiming);
		if (points.length == 0) return "分割方式非法。";
		
		let noteLen = arc_old.EndTiming - arc_old.Timing;
		
		let yhsw = 0.01;
		if (arc_old.YStart == 0 && arc_old.YEnd == 0) yhsw = -0.01;

		for (let i = 1; i < points.length; i++) {

			let p_prev = points[i - 1];
			let p_current = points[i];

			let begin_p = (p_prev - arc_old.Timing) / noteLen;
			let end_p = (p_current - arc_old.Timing) / noteLen;

			let arc_seg = new ArcArc();
			arc_seg.LineType = ArcLineType.S;
			arc_seg.Timing = p_prev;
			arc_seg.EndTiming = p_current;
			arc_seg.Color = arc_old.Color;
			arc_seg.IsVoid = arc_old.IsVoid;
			arc_seg.TimingGroup = arc_old.TimingGroup;

			arc_seg.XStart = Bezier(xEasingBezier, arc_old.XStart, arc_old.XEnd, begin_p);
			arc_seg.YStart = Bezier(yEasingBezier, arc_old.YStart, arc_old.YEnd, begin_p);

			if (pttrnContains(pattern, pttrn.preserve_x)) arc_seg.XEnd = arc_seg.XStart;
			else arc_seg.XEnd = Bezier(xEasingBezier, arc_old.XStart, arc_old.XEnd, end_p);

			if (pttrnContains(pattern, pttrn.preserve_y)) arc_seg.YEnd = arc_seg.YStart;
			else arc_seg.YEnd = Bezier(yEasingBezier, arc_old.YStart, arc_old.YEnd, end_p);

			if (pttrnContains(pattern, pttrn.height_swing)) {
				arc_seg.YStart -= (i % 2 ? 0 : yhsw);
				arc_seg.YEnd -= (i % 2 ? yhsw : 0);
			}
			
			arc_pool.push(arc_seg);

			if (pttrnContains(pattern, pttrn.link_segments)) {
				let arc_lnk = new ArcArc();
				arc_lnk.LineType = ArcLineType.S;
				arc_lnk.Timing = arc_lnk.EndTiming = p_current;
				arc_lnk.Color = arc_old.Color;
				arc_lnk.IsVoid = arc_old.IsVoid;
				arc_lnk.TimingGroup = arc_old.TimingGroup;

				arc_lnk.XStart = arc_seg.XEnd;
				arc_lnk.YStart = arc_seg.YEnd;

				arc_lnk.XEnd = Bezier(xEasingBezier, arc_old.XStart, arc_old.XEnd, end_p);
				arc_lnk.YEnd = Bezier(yEasingBezier, arc_old.YStart, arc_old.YEnd, end_p);
				
				if (pttrnContains(pattern, pttrn.height_swing)) {
					arc_lnk.YEnd -= (i % 2 ? yhsw : 0);
				}

				arc_lnk_pool.push(arc_lnk);
			}
		}
		RemoveArcEvent(arc_old);
	}

	for (let i = 0; i < arc_pool.length; i++) {
		if (i % 2) {
			if (pttrnContains(pattern, pttrn.remove_even)) continue;
			if (pttrnContains(pattern, pttrn.void_altering)) {
				arc_pool[i].IsVoid = !arc_pool[i].IsVoid;
				arc_lnk_pool[i].IsVoid = !arc_lnk_pool[i].IsVoid;
			}
		}
		else {
			if (pttrnContains(pattern, pttrn.remove_odd)) continue;
		}
		AddArcEvent(arc_pool[i]);
		AddArcEvent(arc_lnk_pool[i]);
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

function ALT2BezierY(type) {
	switch (type) {
		case ArcLineType.B:
			return [0.37, 0, 0.63, 1];
		case ArcLineType.SiSi:
		case ArcLineType.SoSi:
			return [0.61, 1, 0.88, 1];
		case ArcLineType.SoSo:
		case ArcLineType.SiSo:
			return [0.12, 0, 0.39, 0];
		default:
			return [0, 0, 1, 1];
	}
}

function ALT2BezierX(type) {
	switch (type) {
		case ArcLineType.B:
			return [0.37, 0, 0.63, 1];
		case ArcLineType.Si:
		case ArcLineType.SiSi:
		case ArcLineType.SiSo:
			return [0.61, 1, 0.88, 1];
		case ArcLineType.So:
		case ArcLineType.SoSo:
		case ArcLineType.SoSi:
			return [0.12, 0, 0.39, 0];
		default:
			return [0, 0, 1, 1];
	}
}

const pttrn = {
	preserve_x: 1,
	preserve_y: 2,
	void_altering: 4,
	remove_even: 8,
	remove_odd: 16,
	link_segments: 32,
	height_swing: 64,

	_default: 0,
	invalid: -1
}

function pttrnContains(pattern, p) {
	return (p != pttrn.invalid) && ((pattern & p) != 0);
}

function parsePttrn(pttrn_str) {
	pttrn_str = pttrn_str.trim();
	if (pttrn_str == "") {
		return pttrn._default;
	}

	let substrs = pttrn_str.split(',');
	let pattern = pttrn._default;

	let set_default = false;
	for (let i = 0; i < substrs.length; i++) {
		substrs[i] = substrs[i].trim();
		switch (substrs[i]) {
			case "px":
			case "py":
			case "va":
			case "rme":
			case "rmo":
			case "ls":
			case "hsw":
				continue;
			case ":":
				set_default = true;
				continue;
			default:
				return pttrn.invalid;
		}
	}
	if (set_default) return pttrn._default;

	let has_pxy = false;
	let set_ls = false;
	for (let i = 0; i < substrs.length; i++) {
		switch (substrs[i]) {
			case "px":
				pattern |= pttrn.preserve_x;
				has_pxy = true;
				break;
			case "py":
				pattern |= pttrn.preserve_y;
				has_pxy = true;
				break;
			case "va":
				pattern |= pttrn.void_altering;
				break;
			case "rme":
				if (pattern & pttrn.remove_odd) {
					return pttrn.invalid;
				}
				pattern |= pttrn.remove_even;
				break;
			case "rmo":
				if (pattern & pttrn.remove_even) {
					return pttrn.invalid;
				}
				pattern |= pttrn.remove_odd;
				break;
			case "ls":
				set_ls = true;
				break;
			case "hsw":
				pattern |= pttrn.height_swing;
				break;
		}
	}

	// 只有在存在px或py的情况下，ls才生效
	if (set_ls && has_pxy) {
        pattern |= pttrn.link_segments;
    }

	return pattern;
}

function parseBezier(bezier_str) {
	

	let params = bezier_str.split(',');
	if (params.length != 4) return [];

	for (let i = 0; i < 4; i++) {
		params[i] = parseFloat(params[i]);
		if (isNaN(params[i])) return [];
	}
	if (params[0] > 1 || params[0] < 0 || params[2] > 1 || params[2] < 0) return [];

	return params;
}

/**
 * > 参数 a, b, c, d
 * 指定三次贝塞尔曲线样式cubic-bezier(a, b, c, d)。
 * 起止点为(0, 0)和(1, 1)，两控制点为(a, b)和(c, d)。
 * 
 * > 参数 x
 * 指定一个X坐标，其唯一对应曲线上的一点。
 * 
 * > 返回
 * 指定点的Y坐标。
 */
function Bezier(bezier_arr, begin, end, x) {
	y = bezierY(x, bezier_arr);
	return begin + (end - begin) * y;
}

function bezierY(x, bezier_arr) {
	
	let a = bezier_arr[0];
	let b = bezier_arr[1];
	let c = bezier_arr[2];
	let d = bezier_arr[3];

    // 定义精度阈值和最大迭代次数
    const tolerance = 1e-7;
    const max_iter_cnt = 50;
    
    // 二分法求解参数 t
    let low = 0;
    let high = 1;
    let t = 0.5;
    
    for (let i = 0; i < max_iter_cnt; i++) {
    
		// 计算当前 t 值对应的贝塞尔曲线 x 坐标
    	const t1 = 1 - t;
        const x_current = 3 * a * t1 * t1 * t + 3 * c * t1 * t * t + t * t * t;
        
        // 检查是否满足精度要求
        if (Math.abs(x_current - x) < tolerance) break;
        
        // 调整二分区间
        if (x_current < x) low = t;
        else high = t;

        t = (low + high) / 2;
    }
    
    // 使用求解的 t 值计算 y 坐标
    const t1 = 1 - t;
    const y = 3 * b * t1 * t1 * t + 3 * d * t1 * t * t + t * t * t;
    
    return y;
}

function instruction_acbz(page) {
	switch (page) {
		case 0:
			return  "本工具用于便捷把蛇切割为数段。\n" + 
					"选中若干条蛇，然后填入对应参数，最后执行本工具即可。\n" + 
					"工具会根据参数对每一条蛇进行同样的切割处理。\n\n" + 

					"留空“使用说明”参数后即可执行本工具。\n" + 
					"输入参数编号（从1开始，从上至下依次+1）并执行，可查询对应参数的详细说明。\n" + 
					"再次查看本说明可将“使用说明”参数填为0后执行。\n\n" + 

					"接收数字参数时使用IEEE 754双精度浮点数，因此传入过大的数可能导致精度丢失。\n\n" + 

					"本工具由IzayoiArika编写，转发时请保留本句署名。";
		case 1:
		case 2:
			return  "- 贝塞尔曲线参数\n\n" + 

					"> 解释\n" + 
					"切割蛇时，根据此参数来决定切割后的形状。\n\n" + 

					"> 要求\n" + 
					"留空，或形如a, b, c, d的字符串。\n" +  
					"留空时根据已经设置的蛇形进行切割，否则根据给定的贝塞尔曲线语句进行切割。\n" + 
					"b, d是任意实数，a, c是落在[0, 1]上的实数。\n\n" + 

					"> 非法处理\n" + 
					"拒绝执行。"
		case 3:
			return  "- 分割方式\n\n" + 

					"> 解释\n" + 
					"切割蛇时，根据此参数来决定时间上如何切割。\n\n" + 

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
		case 4:
			return  "- 切割样式\n\n" + 

					"> 解释\n" + 
					"指定切割蛇的方式。\n\n" + 

					"> 要求\n" + 
					"留空时不采取以下任何追加样式。也可使用,分割的若干个的样式字符串。样式字符串包括：\n" + 
					"- :\n" + 
					"特殊的样式字符串，指定应用默认样式并忽略其他所有样式字符串。\n" + 
					"- px\n" + 
					"单段蛇的X坐标固定为该段蛇开头的X坐标。\n" + 
					"- py\n" + 
					"单段蛇的Y坐标固定为该段蛇开头的Y坐标。\n" + 
					"- va\n" + 
					"第一段蛇的虚实与原来一致，此后两段相邻的蛇虚实相反。\n" + 
					"- rme\n" + 
					"偶数段被移除，奇数段被保留。\n" + 
					"※ 与rmo互斥。\n" + 
					"- rmo\n" + 
					"奇数段被移除，偶数段被保留。\n" + 
					"※ 与rme互斥。\n" + 
					"- ls\n" + 
					"使用直角蛇连接相邻的两段蛇。\n" + 
					"※ 仅在存在px或py时生效。\n" + 
					"- hsw\n" + 
					"切割时自带0.01幅度的上下抖动。\n\n" + 

					"> 非法处理\n" + 
					"拒绝执行。\n\n" + 

					"> 默认值\n" + 
					"空。";
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