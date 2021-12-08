const puppeteer = require('puppeteer');
const { writeFile } = require('fs');
const path = './results.json';

async function scrapeData(leagues) {

	const browser = await puppeteer.launch({
		headless: true,
		ignoreHTTPSErrors: true
	});
	const page = await browser.newPage();

	const scrapeData = async () => {
		let stats = []

		for (let i = 0; i < leagues.length; i++) {

			await page.goto(leagues[i].url, { waitUntil: "load" })
			console.log('====  ' + leagues[i].league + '  ====')

			let links = await page.$$eval('.ui-table .ui-table__body .ui-table__row', table => {
				const teamsLinks = []

				table.map(function(e) {
					const teamLink = e.querySelector('.tableCellParticipant__name').href;
					teamsLinks.push(`${teamLink}results/`);
				})
				return (teamsLinks);
			})

			for (let i = 0; i < links.length; i++) {
				console.log(links[i]);

				await page.goto(links[i], { waitUntil: "load" })
				// console.log(links[i].team)

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
			}
		}

		browser.close();

		return stats;
	}
	
	return scrapeData();
}

module.exports = {
	scrapeData
}




