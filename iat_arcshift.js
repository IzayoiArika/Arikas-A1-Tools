
function OnLoad()
{
	return {
		"providers": ["iat_arcshift"],
		"info": {
			"iat_arcshift": {
				"name": "IATools - Arc平移工具",
				"params": ["X偏移","Y偏移", "出界控制策略", "使用说明"],
				"params_value": {
					"X偏移": "",
					"Y偏移": "",
					"出界控制策略": "",
					"使用说明": "0"
				}
			}
		}
	}
}

function iat_arcshift(xshift, yshift, oob_strategy, page) {
	
	page = page.trim();
	if (page != "") {
		let instr = instruction(parseFloat(page));
		if (instr == "") {
			return "“使用说明”参数非法。";
		}
		return instr;
	}

	let notes = GetSelectedNotes();
	if (notes.length < 1) return "请选择要平移的物件。";

	xshift = parseFloat(xshift.trim());
	if (isNaN(xshift)) xshift = 0;

	yshift = parseFloat(yshift.trim());
	if (isNaN(yshift)) yshift = 0;

	oob_strategy = oob_strategy.trim();
	switch (oob_strategy) {
		case "future":
		case "future_6k":
		case "beyond":
		case "beyond_6k":
		case "none":
			break;
		default:
			oob_strategy = "future";
	}

	let note;
	for (let i = 0; i < notes.length; i++) {
	    note = notes[i];
	    if (!(note instanceof ArcArc)) continue;
		let arc = new ArcArc();
		arc.LineType = note.LineType;
		arc.Timing = note.Timing;
		arc.EndTiming = note.EndTiming;
		arc.Color = note.Color;
		arc.YStart = regulateCoordY(note.YStart + yshift, oob_strategy);
		arc.YEnd = regulateCoordY(note.YEnd + yshift, oob_strategy);
		arc.XStart = regulateCoordX(note.XStart + xshift, oob_strategy, arc.YStart);
	    arc.XEnd = regulateCoordX(note.XEnd + xshift, oob_strategy, arc.YEnd);
		arc.IsVoid = note.IsVoid;
		arc.TimingGroup = note.TimingGroup;
		AddArcEvent(arc);
		for (let ai = 0; ai < note.ArcTaps.count; ai++) {
		    AddArcTap(arc, note.ArcTaps[ai]);
		}
		RemoveArcEvent(note);
	}
	return "执行完成。";
}

function regulateCoordY(coord, strategy) {
	if (strategy == "none") return coord;

	let bottom = 0;
	let top;
	switch (strategy) {
		case "future":
		case "beyond":
			top = 1;
			break;
		case "future_6k":
		case "beyond_6k":
			top = 1.61;
			break;
		default:
			return NaN;
	}
	if (coord > top) return top;
	if (coord < bottom) return bottom;
	return coord;
}

function regulateCoordX(coord, strategy, y_coord) {
	if (strategy == "none") return coord;

	let left, right, y_percent;
	switch (strategy) {
		case "future":
			y_percent = y_coord;
			left = -0.5 + 0.5 * y_percent;
			right = 1.5 - 0.5 * y_percent;
			break;
		case "beyond":
			y_percent = y_coord;
			left = -0.5 + 0.25 * y_percent;
			right = 1.5 - 0.25 * y_percent;
			break;
		case "future_6k":
			y_percent = y_coord / 1.61;
			left = -1 + 0.75 * y_percent;
			right = 2 - 0.75 * y_percent;
			break;
		case "beyond_6k":
			y_percent = y_coord / 1.61;
			left = -1 + 0.375 * y_percent;
			right = 2 - 0.375 * y_percent;
			break;
	}
	if (coord > right) return right;
	if (coord < left) return left;
	return coord;
}

function instruction(page) {
	switch (page) {
		case 0:
			return  "本工具用于移动Arc；如为黑线，则会带着Arctap一并移动。\n" + 
					"选中一段谱面后填入对应参数，然后执行本工具即可。\n" + 
					"工具会自动跳过Tap和Hold，不必手动取消选中。\n\n" + 

					"留空“使用说明”参数后即可执行本工具。\n" + 
					"输入参数编号（从1开始，从上至下依次+1）并执行，可查询对应参数的详细说明。\n" + 
					"再次查看本说明可将“使用说明”参数填为0后执行。\n\n" + 

					"接收数字参数时使用IEEE 754双精度浮点数，因此传入过大的数可能导致精度丢失。\n" + 
					"处理含Arctap的黑线时，部分Arcade会报错，但实际上是成功的。此时请点左侧栏的保存按钮保存，然后重新打开谱面即可。\n\n" + 

					"本工具由IzayoiArika编写，转发时请保留本句署名。";
		case 1:
			return  "- X偏移\n\n" + 

					"> 解释\n" + 
					"所有选中的Arc的X坐标增量。\n" + 
					"正值向右移动，负值向左移动。\n\n" + 

					"> 要求\n" + 
					"实数。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"0。"
		case 2:
			return  "- Y偏移\n\n" + 

					"> 解释\n" + 
					"所有选中的Arc的Y坐标增量。\n" + 
					"正值向上移动，负值向下移动。\n\n" + 

					"> 要求\n" + 
					"实数。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"0。"
		case 3:
			return  "- 出界控制策略\n\n" + 

					"> 解释\n" + 
					"根据该参数，若移动后超出界外，采取不同处理方案。\n\n" + 

					"> 要求\n" + 
					"只允许填写future、beyond、future_6k、beyond_6k、none中的一个。\n" + 
					"采用none模式时，不对超界坐标做任何控制；采用任何其他模式都会将超界的坐标拉回至最近的边界位置。\n" + 
					"采用future或future_6k模式时，移动后坐标控制在Future难度4k或6k梯形框内。\n" + 
					"采用beyond或beyond_6k模式时，移动后坐标控制在Beyond难度4k或6k梯形框内。\n\n" + 

					"> 非法处理\n" + 
					"采用默认值。\n\n" + 

					"> 默认值\n" + 
					"future。"
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