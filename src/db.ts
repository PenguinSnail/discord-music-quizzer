import fs from 'fs';

let dbData: any = {};

try {
	let rawData = fs.readFileSync('./db.json', 'utf8')
	dbData = JSON.parse(rawData)
} catch {
	fs.writeFileSync('./db.json', '')
}

export function addSong(artist: string, song: string, id: string) {
	if (!dbData[artist]) dbData[artist] = {};
	dbData[artist][song] = id;
	fs.writeFileSync('./db.json', JSON.stringify(dbData));
}

export function findSong(artist: string, song: string) {
	if (!dbData[artist]) {
		return null;
	} else if (!dbData[artist][song]) {
		return null;
	} else {
		return dbData[artist][song];
	}
}