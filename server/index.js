const fs = require('fs');
const { writeFile } = require('fs');
const express = require('express')
const app = express()
const port = 3000
const path = './results.json';

const bodyParser = require('body-parser');

const scrapers = require('./scrapers');
const db = require('./db')

app.use(bodyParser.json())
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*"); // disabled for security on local
	res.header("Access-Control-Allow-Headers", "Content-Type");
	next();
});

app.get('/creators', async (req, res) => {

	let rawdata = await fs.readFileSync('./results.json');
	let results = await JSON.parse(rawdata);

	try {
		res.send(results)
	} catch (error) {
		console.error(error);
	}
})

app.post('/creators', async (req, res) => {
	let rawdata = await fs.readFileSync('./teams.json');
	let teams = await JSON.parse(rawdata);
	
	const getData = async () => {
		return await scrapers.scrapeData(teams)
	}

	getData().then(data => {
		writeFile(path, JSON.stringify(data), {flag: 'a+'}, (error) => {
			if (error) {
				console.log('An error has occurred ', error);
				return;
			}
			console.log(`Data written successfully`);
		});
	})

	writeFile(path, '', (error) => {
		if (error) {
			console.log('An error has occurred ', error);
			return;
		}
		console.log(`JSON file clear`);
	});
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
