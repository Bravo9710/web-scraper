const puppeteer = require('puppeteer');
const { writeFile } = require('fs');
const path = './results.json';

async function scrapeData(teams) {

	const browser = await puppeteer.launch({
		headless: true,
		ignoreHTTPSErrors: true
	});
	const page = await browser.newPage();

	const scrapeData = async () => {
		let stats = []

		for (let i = 0; i < teams.length; i++) {

			await page.goto(teams[i].url, { waitUntil: "load" })
			console.log(teams[i].team)

			// await page.goto(team.url);

			// const el = await page.waitForSelector('.event__match');
			// const event = await page.waitForSelector('.sportName');

			// const text = await el.getProperty('textContent');
			// const name = await text.jsonValue();

			// let event = await page.$$eval('.event', tables => {
			// 	// const sportEvent = tables[0].querySelector('.sportName')

			// 	// return sportEvent

			// 	// let sportEvent = tables.map(function(table) {
			// 	// 	return table.querySelector('.sportName')
			// 	// })

			// 	return tables.map(function(e) {
			// 		return e.querySelector('.sportName')
			// 	})

			// 	// return sportEvent;
			// });

			let event = await page.$$eval('.event', table => {
				const sortData = []

				table.map(function(e) {
					const list = e.querySelector('.sportName')

					for (let i = 0; i < list.children.length; i++) {
						sortData.push(list.children[i].innerText)
					}
						// sortData.push(list.children[0].innerText)

				})
				return (sortData);
			})

			// console.log(eventTable)

			let matches = await page.$$eval('.event__match', matches => {
				let goalsSum = matches.map(function(match) {
					const homeGoals = parseInt(match.querySelector('.event__score--home').textContent)
					const awayGoals = parseInt(match.querySelector('.event__score--away').textContent)

					return homeGoals + awayGoals
				})
				return goalsSum;
			});

			let teamName = await page.$$eval('.teamHeader__information', name => {
				return name.map(function(e) {
					return e.querySelector('.teamHeader__name').innerText
				})
			})

			stats.push({team: teamName[0], results: matches, table: event})

			// console.log(stats);
		}

		browser.close();

		return stats;


		// return await Promise.all(teams.map(async function(team){
		// 	// return await scrapers.scrapeData(teams)

		// 	// console.log(team.url)
		// 	// page.waitForNavigation()
		// 	// await page.goto(team.url, { waitUntil: "load" })
		// 	await page.goto(team.url, { waitUntil: "load" })

		// 	// await page.goto(team.url);

		// 	const el = await page.waitForSelector('.event__match');

		// 	// const text = await el.getProperty('textContent');
		// 	// const name = await text.jsonValue();

		// 	let matches = await page.$$eval('.event__match', matches => {
		// 		let goalsSum = matches.map(function(match) {
		// 			const homeGoals = parseInt(match.querySelector('.event__score--home').textContent)
		// 			const awayGoals = parseInt(match.querySelector('.event__score--away').textContent)

		// 			return homeGoals + awayGoals
		// 		})

		// 		return goalsSum;
		// 	});

		// 	// console.log(matches)

		// 	let teamName = await page.$$eval('.teamHeader__information', name => {
		// 		return name.map(function(e) {
		// 			return e.querySelector('.teamHeader__name').innerText
		// 		})
		// 	});

		// 	return await {team: teamName[0], results: matches};
		// }))

	}


	

	// writeFile(path, JSON.stringify({team: teamName[0], results: matches}), {flag: 'a+'}, (error) => {
	// 	if (error) {
	// 		console.log('An error has occurred ', error);
	// 		return;
	// 	}
	// 	console.log(`Data ${teamName[0]} written successfully to disk`);
	// });
	
	return scrapeData();
}

module.exports = {
	scrapeData
}




