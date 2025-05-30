function OnLoad()
{
	return {
		"providers": ["iat_hivemind"],
		"info": {
			"iat_hivemind": {
				"name": "IATools - Tap变Arctap",
				"params": ["使用说明"],
				"params_value": {
					"使用说明": "0"
				}
			}
		}
	}
}

function iat_hivemind(page) {

	page = page.trim();
	if (page != "") {
		let instr = instruction_hvmd(parseFloat(page));
		if (instr == "") {
			return "“使用说明”参数非法。";
		}
		return instr;
	}

    let notes = GetSelectedNotes();
    
	for (let j = 0; j < notes.length; j++) {
		let note = notes[j];
		if (note instanceof ArcTap) {
			tap_x_coord = 0.5 * note.Track - 0.75;

			let arc = new ArcArc();
			arc.Timing = note.Timing;
			arc.EndTiming = note.Timing + 1;
			arc.Color = 0;
			arc.IsVoid = true;
			arc.LineType = ArcLineType.S;
			arc.XStart = tap_x_coord;
			arc.YStart = 0;
			arc.XEnd = tap_x_coord;
			arc.YEnd = 0;
			arc.TimingGroup = note.TimingGroup;
			AddArcEvent(arc);

			let at = new ArcArcTap();
			at.Timing = note.Timing;
			AddArcTap(arc, at);

			RemoveArcEvent(note);
		}
	}
    return "执行成功。";
}

function instruction_hvmd(page) {
	switch (page) {
		case 0:
			return  "本工具用于一键把Tap换成同位置的Arctap。\n" + 
					"选中一段谱面后执行本工具即可。\n\n" + 

					"留空“使用说明”参数后即可执行本工具。\n" + 
					"再次查看本说明可将“使用说明”参数填为0后执行。\n\n" + 

					"本工具由IzayoiArika编写，转发时请保留本句署名。";
		default:
			return "";
	}
}