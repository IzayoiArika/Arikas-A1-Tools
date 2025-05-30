
function OnLoad()
{
	return {
		"providers": ["iat_mirrorwaxis"],
		"info": {
			"iat_mirrorwaxis": {
				"name": "IATools - 指定对称轴的镜像",
				"params": ["对称轴参数", "地面物件处理策略", "颜色处理策略", "使用说明"],
				"params_value": {
					"对称轴参数": "",
					"地面物件处理策略": "",
					"颜色处理策略": "",
					"使用说明": "0"
				}
			}
		}
	}
}

function iat_mirrorwaxis(axis, fn_strategy, clr_strategy, page) {
    
	page = page.trim();
	if (page != "") {
		let instr = instruction_mwax(parseFloat(page));
		if (instr == "") {
			return "“使用说明”参数非法。";
		}
		return instr;
	}

	fn_strategy = fn_strategy.trim();
	switch (fn_strategy) {
		case "never":
		case "always":
		case "exactonly":
		case "approx":
			break;
		default:
			fn_strategy = "always";
	}

	clr_strategy = clr_strategy.trim();
	switch (clr_strategy) {
		case "nomodify":
		case "flip":
			break;
		default:
			clr_strategy = "flip";
	}

	axis = parseAxis(axis.trim());
	if (axis.length == 0) return "对称轴参数非法。";
	
	let notes = GetSelectedNotes();
	if (notes.length < 1) return "请选择要镜像的物件。";
	
	for (let i = 0; i < notes.length; i++) {
	    let note = notes[i];
	    
		if (note instanceof ArcTap) {
			if (fn_strategy == "never") continue;

			let tap_coord = [note.Track * 0.5 - 0.75, 0];
			tap_coord = flipAboutAxis(axis, tap_coord);
			
			let matched = false;
			switch (fn_strategy) {
				case "always":
					break;
				case "exactonly":
					for (let lane = 0; lane < 6; lane++) {
						if (lane * 0.5 - 0.75 == tap_coord[0] && tap_coord[1] == 0) {
							let tap = new ArcTap();
							tap.Timing = note.Timing;
							tap.Track = lane;
							AddArcEvent(tap);
							matched = true;
							break;
						}
					}
					break;
				case "approx":
					for (let lane = 0; lane < 6; lane++) {
						if (Math.abs(lane * 0.5 - 0.75 - tap_coord[0]) <= 0.05 && Math.abs(tap_coord[1] - 0) <= 0.05) {
							let tap = new ArcTap();
							tap.Timing = note.Timing;
							tap.Track = lane;
							AddArcEvent(tap);
							matched = true;
							break;
						}
					}
					break;
			}
			if (!matched) {
				let arc_at = new ArcArc();
				arc_at.LineType = ArcLineType.S;
				arc_at.Timing = note.Timing;
				arc_at.EndTiming = note.Timing + 1;
				arc_at.IsVoid = true;
				arc_at.TimingGroup = note.TimingGroup;
				arc_at.Color = 0;
				[arc_at.XStart, arc_at.YStart] = tap_coord;
				[arc_at.XEnd, arc_at.YEnd] = tap_coord;
				AddArcEvent(arc_at);
				
				let at = new ArcArcTap();
				at.Timing = note.Timing;
				AddArcTap(arc_at, at);
			}

		}
		else if (note instanceof ArcHold) {
			if (fn_strategy == "never") continue;

			let hold_coord = [note.Track * 0.5 - 0.75, 0];
			hold_coord = flipAboutAxis(axis, hold_coord);
			
			let matched = false;
			switch (fn_strategy) {
				case "always":
					break;
				case "exactonly":
					for (let lane = 0; lane < 6; lane++) {
						if (lane * 0.5 - 0.75 == hold_coord[0] && hold_coord[1] == 0) {
							let hold = new ArcHold();
							hold.Timing = note.Timing;
							hold.EndTiming = note.EndTiming;
							hold.Track = lane;
							AddArcEvent(hold);
							matched = true;
							break;
						}
					}
					break;
				case "approx":
					for (let lane = 0; lane < 6; lane++) {
						if (Math.abs(lane * 0.5 - 0.75 - hold_coord[0]) <= 0.05 && Math.abs(hold_coord[1] - 0) <= 0.05) {
							let hold = new ArcHold();
							hold.Timing = note.Timing;
							hold.EndTiming = note.EndTiming;
							hold.Track = lane;
							AddArcEvent(hold);
							matched = true;
							break;
						}
					}
					break;
			}
			if (!matched) {
				let arc_hold = new ArcArc();
				arc_hold.LineType = ArcLineType.S;
				arc_hold.Timing = note.Timing;
				arc_hold.EndTiming = note.EndTiming;
				arc_hold.IsVoid = false;
				arc_hold.TimingGroup = note.TimingGroup;
				arc_hold.Color = 2;
				[arc_hold.XStart, arc_hold.YStart] = hold_coord;
				[arc_hold.XEnd, arc_hold.YEnd] = hold_coord;
				AddArcEvent(arc_hold);
			}

		}
		else {
			let arc = new ArcArc();
			arc.LineType = note.LineType;
			arc.Timing = note.Timing;
			arc.EndTiming = note.EndTiming;
			arc.IsVoid = note.IsVoid;
			arc.TimingGroup = note.TimingGroup;

			arc.Color = (clr_strategy == "nomodify" ? note.Color : mirroredColor(note.Color));

			[arc.XStart, arc.YStart] = flipAboutAxis(axis, [note.XStart, note.YStart]);
			[arc.XEnd, arc.YEnd] = flipAboutAxis(axis, [note.XEnd, note.YEnd]);
			
			AddArcEvent(arc);
			for (let ai = 0; ai < note.ArcTaps.count; ai++) {
				let at = new ArcArcTap();
				at.Timing = note.ArcTaps[ai].Timing;
				AddArcTap(arc, at);
			}
		}
		RemoveArcEvent(note);
	}
}

function mirroredColor(color) {
	switch (color) {
		case 0:
			return 1;
		case 1:
			return 0;
		case 2:
		case 3:
		case 4:
			return color;
		default:
			return 2;
	}
}

function flipAboutAxis([A, B, C], [x, y]) {
	const temp = (C - A * x - B * y) / (A * A + B * B);
	return [x + 2 * temp * A, y + 2 * temp * B];
}

// Ax + By = C
function parseAxis(str) {
	if (str == "") return [1, 0, 0.5];

	let params = [];
	
	// x: p, or y: p
	params = str.split(':');
	if (params.length > 2) return [];
	else if (params.length == 2) {
		let direction = params[0].trim();
		let coord = params[1].trim();
		if (coord == "") coord = 0.5;
		else {
			coord = Number(coord);
			if (isNaN(coord) || !isFinite(coord)) return [];
		}
		switch (direction) {
			case "x":
			case "X":
				return [1, 0, coord];
			case "y":
			case "Y":
				return [0, 1, coord];
			default:
				return [];
		}
	}
	
	// A, B, C
	params = str.split(',');
    
    if (params.length > 3) return [];
    while (params.length < 3) params.push("");

    for (let i = 0; i < 3; i++) {
		let param = params[i].trim();
		params[i] = (param == "" ? 0 : Number(param));
		if (isNaN(params[i]) || !isFinite(params[i])) return [];
    }

	if (params[0] == 0 && params[1] == 0) return [];
    return params;
}

function instruction_mwax(page) {
	switch (page) {
		case 0:
			return  "本工具用于把物件按给定的对称轴进行对称翻转。\n" + 
					"本工具执行时将地面物件的Y坐标视作0，而非地面的实际坐标-0.22。\n" + 
					"选中若干物件，然后填入对应参数，最后执行本工具即可。\n\n" + 

					"留空“使用说明”参数后即可执行本工具。\n" + 
					"输入参数编号（从1开始，从上至下依次+1）并执行，可查询对应参数的详细说明。\n" + 
					"再次查看本说明可将“使用说明”参数填为0后执行。\n\n" + 

					"接收数字参数时使用IEEE 754双精度浮点数，因此传入过大的数可能导致精度丢失。\n\n" + 

					"本工具由IzayoiArika编写，转发时请保留本句署名。";
		case 1:
			return  "- 对称轴参数\n\n" + 

					"> 解释\n" + 
					"通过直线方程参数指定对称轴。\n\n" + 

					"> 要求\n" + 
					"接受留空（此时行为与默认的镜像一致）或以下两种方案。\n" +  
					"- 方案一\n" + 
					"形如\"x: p\"或\"y: p\"的字符串，指定对称轴为x=p或y=p，其中p是一个数字。\n" + 
					"p可省略，被省略时视作0.5。\n" + 
					"- 方案二\n" + 
					"用,分割的三个数A, B, C，指定对称轴为Ax+By=C。\n" +  
					"可省略部分参数，被省略时视作0。输入超过3个参数，或参数不为有效的数时视作非法。\n" + 
					"例如：\n" +
					"输入\"1,2,3\"表示对称轴为x+2y=3。\n" + 
					"输入\"1,,0.5\"表示对称轴为x=0.5。\n" + 
					"输入\",,1\"表示0=1，因其不是有效的直线而视作非法。\n" + 
					"输入\"1\"表示对称轴为x=0。\n" + 
					"输入\"p,2,3\"时，因p不是有效的数而视作非法。\n" + 
					"输入\"1,2,3,4\"时，因接收到4>3个参数而视作非法。\n\n" + 

					"> 常用示例\n" + 
					"以下说明中，p是一个确定的数。\n" + 
					"关于某竖直轴进行对称可使用\"1,,p\"或\"x: p\"，这会让物件沿x=p左右对称。\n" +  
					"关于某水平轴进行对称可使用\",1,p\"或\"y: p\"，这会让物件沿y=p上下对称。\n\n" +  

					"> 非法处理\n" + 
					"拒绝执行。"
		case 2:
			return  "- 地面物件处理策略\n\n" + 

					"> 解释\n" + 
					"指定地面物件的处理方式。注意本工具不会把天空物件处理到地面上。\n\n" + 

					"> 要求\n" + 
					"只接受以下值的一个：never, always, exactonly, approx\n" + 
					"- never\n" + 
					"不处理任何地面物件。\n" + 
					"- always\n" + 
					"在镜像后位置对应地生成Arctap或Arc。\n" + 
					"- exactonly\n" + 
					"仅当镜像后的坐标精确地等于轨道中线坐标时，将其转化为Tap或Hold，否则转化为Arctap或Arc。\n" + 
					"- approx\n" + 
					"当镜像后的坐标相当接近轨道中线时，将其转化为Tap或Hold，否则转化为Arctap或Arc。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"always。";
		case 3:
			return  "- 颜色处理策略\n\n" + 

					"> 解释\n" + 
					"指定蛇颜色的处理策略。\n\n" + 

					"> 要求\n" + 
					"只接受以下值的一个：flip, nomodify。\n" + 
					"- flip\n" + 
					"红色与蓝色互换。\n" + 
					"- always\n" + 
					"不做更改。\n" + 
					"※ 对于颜色为2, 3, 4的蛇，本工具镜像后予以保留；对于0-4以外颜色的蛇，本工具镜像后全部归为绿色（2）。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"flip。";
		case 4:
			return  "- 使用说明\n\n" + 

					"> 解释\n" + 
					"根据参数编号，查询对应参数的详细说明。\n" + 
					"特别的：值为0时返回工具概述；留空时执行工具的实际功能。\n\n" + 

					"> 要求\n" + 
					"只接受以下值或留空：0, 1, 2, 3, 4。\n\n" + 

					"> 非法处理\n" + 
					"拒绝执行。";
		default:
			return "";
	}
}