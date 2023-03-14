const puppeteer = require('puppeteer');
const { writeFile } = require('fs');
const path = './results.json';

async function scrapeData(bookmakers) {

	const browser = await puppeteer.launch({
		headless: false,
		ignoreHTTPSErrors: true
	});

	const page = await browser.newPage();

	const scrapeData = async () => {
		const leaguesStats = []

		for (let i = 0; i < bookmakers.length; i++) {
			for (let y = 0; y < bookmakers[i].urls.length; y++) {
				await page.goto(bookmakers[i].urls[y], { waitUntil: "load" })
				const bookmakerVaribale = bookmakers[i].bookmaker
				console.log('====  ' + bookmakerVaribale + ' Fixtures  ====')
				let matchesArray = [];
				// let fixtures = []

				//Get all fixtures form $this league
				// if (bookmakerVaribale === "Flashscore") {
					let fixtures = await page.$$eval('.leagues--static', table => {
						const fixturesUrls = [];
						const events = document.querySelectorAll('.event__match')

						for (let i = 0; i < 26; i++) {
							fixturesUrls.push(`https://www.flashscore.bg/match/${events[i].id.slice(4)}/#/odds-comparison/home-away/full-time`);
						}
						return (fixturesUrls);
					})
				// } else if (bookmakerVaribale === "Winbet") {
				// 	fixtures = await page.$$eval('.block--league-markets', table => {
				// 		const fixturesUrls = [];

				// 		const events = document.querySelectorAll('.btn-odds__odd')

				// 		for (let i = 0; i < events.length; i++) {
				// 			fixturesUrls.push(events[i].innerHTML);
				// 		}
				// 		return (fixturesUrls);

						// document.addEventListener("load", () => {
						// 	console.log('document loaded')

						// //Click on dropdown button and then select type of bet
						// const selectorTrigger = document.getElementsByClassName("btn-dropdown")[0].click()

						// /*
						// 	Select bet type:
						// 	1 == 'Брой голове'
						// 	4 == 'Равенство няма залог'
						// 	5 == 'Двата отбора да отбележят'
						//  */
						// setTimeout(() => {
						// 	const selectorDropdown = document.getElementsByClassName("dropdown-item")[4].click()
						// }, 1)
						
						// setTimeout(() => {
						// 	const events = document.querySelectorAll('.event--fw')
						// 	fixturesUrls.push(events)
						// 	return (fixturesUrls);
						// }, 100)
						// })



						// for (let i = 0; i < 26; i++) {
						// 	fixturesUrls.push(`https://www.flashscore.bg/match/${events[i].id.slice(4)}/#/odds-comparison/home-away/full-time`);
						// }
					// })
				// }


				console.log(fixtures)

				//Run all fixtures and get data 
				for (let i = 0; i < fixtures.length; i ++) {
					// if (bookmakerVaribale === "Flashscore") {
						await page.goto(fixtures[i], { waitUntil: "load" })

						//Skip if there is not bookmaker odds for this match
						if (page.url() != fixtures[i]) {
							continue;
						}

						//Wait to load odds table in DOM
						await page.waitForSelector('.ui-table.oddsCell__odds')
						let eventObject = await page.$$eval('.container__detailInner', table => {
							let eventInfo = {
								homeTeam: '',
								awayTeam: '',
								eventDate: '',
								bookamkers: []
							};

							table.map(function(e) {
								const homeTeam = e.querySelector('.duelParticipant__home a.participant__participantName.participant__overflow').innerHTML;
								const awayTeam = e.querySelector('.duelParticipant__away a.participant__participantName.participant__overflow').innerHTML;
								const eventDate = e.querySelector('.duelParticipant__startTime div').innerHTML;
								const eventBookmakerRows = e.querySelectorAll('.ui-table__body .ui-table__row');

								eventInfo.homeTeam = homeTeam;
								eventInfo.awayTeam = awayTeam;
								eventInfo.eventDate = eventDate;

								for (let i = 0; i < eventBookmakerRows.length; i++) {
									const name = eventBookmakerRows[i].querySelector('.oddsCell__bookmakerPart > .oddsCell__bookmaker > a').getAttribute("title");
									const homeOdd = eventBookmakerRows[i].querySelectorAll('.oddsCell__odd > span')[0].innerHTML;
									const awayOdd = eventBookmakerRows[i].querySelectorAll('.oddsCell__odd > span')[1].innerHTML;

									eventInfo.bookamkers.push({name: name, homeOdd: homeOdd, awayOdd: awayOdd});
								};
							})

							return eventInfo;
						})

						matchesArray.push(eventObject);
					// } else if (bookmakerVaribale === "Winbet") {
						// matchesArray.push(fixtures);
					// }

				}
				
				leaguesStats.push({fixtures: matchesArray})

			}
		}
				console.log(leaguesStats)
		// browser.close();

		return leaguesStats;
	}

	return scrapeData();
}

module.exports = {
	scrapeData
}




