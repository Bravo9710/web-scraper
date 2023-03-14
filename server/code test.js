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
		let leaguesStats = []

		for (let i = 0; i < bookmakers.length; i++) {
			for (let y = 0; y < bookmakers[i].urls.length; y++) {
				await page.goto(bookmakers[i].urls[y], { waitUntil: "load" })
				console.log(bookmakers[i].urls[y])
				const bookmakerVaribale = bookmakers[i].bookmaker
				console.log('====  ' + bookmakerVaribale + ' Fixtures  ====')
				let matchesArray = [];

				//Get all fixtures form $this league
				if (bookmakerVaribale === "flashscore") {
					let fixtures = await page.$$eval('.leagues--static', table => {
						const fixturesUrls = [];
						const events = document.querySelectorAll('.event__match')

						for (let i = 0; i < 26; i++) {
							fixturesUrls.push(`https://www.flashscore.bg/match/${events[i].id.slice(4)}/#/odds-comparison/home-away/full-time`);
						}
						return (fixturesUrls);
					})

					console.log(fixtures)

					//Run all fixtures and get data 
					for (let i = 0; i < fixtures.length; i ++) {
					///// TEST WITH SMALL NUMBERS
					// for (let i = 0; i < 5; i ++) {
					///// TEST WITH SMALL NUMBERS
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
								bookmakers: []
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
									const homeOdd = eventBookmakerRows[i].querySelectorAll('.oddsCell__odd > span')[0];
									const awayOdd = eventBookmakerRows[i].querySelectorAll('.oddsCell__odd > span')[1];

									if (homeOdd.classList.contains('oddsCell__lineThrough') || awayOdd.classList.contains('oddsCell__lineThrough')) {
										continue;
									}

									eventInfo.bookmakers.push({name: name, homeOdd: homeOdd.innerHTML, awayOdd: awayOdd.innerHTML});
								};
							})

							return eventInfo;
						})

						matchesArray.push(eventObject);
					}
					
					leaguesStats.push({fixtures: matchesArray})

				} else if (bookmakerVaribale === "winbet" || bookmakerVaribale === "inbet") {

					/*
					  Wait for dropdown for bet types to load. Then click it and select
					  wanted bet type
					 */
					await page.waitForSelector('.btn-dropdown')
					await page.click('.btn-dropdown')
					await page.waitForSelector('.dropdown-item')
					/*
					Select bet type:
					1 == 'Брой голове'
					4 == 'Равенство няма залог'
					5 == 'Двата отбора да отбележят'
					*/
					await page.click('.dropdown-item:nth-child(5)')

					//Wait for accordions that are not opened to load
					await page.waitForSelector('.accordion--level-2:not(.accordion--level-2--open)')
					//Then select them all
					const elements = await page.$$('.accordion--level-2:not(.accordion--level-2--open)');
					//And trigger click event on them to open
					await elements.forEach(async element => {
						await element.click();
					});
					await page.waitForSelector('.event-body.grid-2-cols')
					let fixtures = await page.$$eval('.block--league-markets', (table, leaguesStats, bookmakerVaribale) => {
						const fixturesUrls = [];
						
						table.map(function(e) {
							const matches = e.querySelectorAll('.event--fw');

							matches.forEach((match) => {
								let eventInfo = {
									homeTeam: '',
									awayTeam: '',
									odds: []
								};

								const teamsNames = match.querySelectorAll('.event-header__names .text-truncate.team');
								const teamsOdds = match.querySelectorAll('.event-body.grid-2-cols .btn-odds__odd');

								// leaguesStats.forEach((item) => {
								for (let i = 0; i < leaguesStats[0].fixtures.length; i++) {
									const matchObject = leaguesStats[0].fixtures[i]

									// Add || if the names are reverted
									const homeCheck = matchObject.homeTeam.includes(teamsNames[0].innerHTML);

									// Add || if the names are reverted
									const awayCheck = matchObject.awayTeam.includes(teamsNames[1].innerHTML);


									if (homeCheck && awayCheck) {
										fixturesUrls.push(matchObject)
										matchObject.bookmakers.push({
											name: bookmakerVaribale, 
											// homeOdd: homeCheck, 
											homeOdd: teamsOdds[0].innerText, 
											// awayOdd: awayCheck
											awayOdd: teamsOdds[1].innerText
										})
									}
								}
								// 	const test = leaguesStats[0].fixtures.map(matchObject => {
								// 		const homeCheck = matchObject.homeTeam.includes(teamsNames[0].innerHTML);
								// 		const awayCheck = matchObject.awayTeam.includes(teamsNames[1].innerHTML);

								// 		// if (homeCheck && awayCheck) {
								// 			matchObject.bookmakers.push({
								// 				name: bookmakerVaribale, 
								// 				homeOdd: homeCheck, 
								// 				// homeOdd: teamsOdds[0].innerText, 
								// 				awayOdd: awayCheck
								// 				// awayOdd: teamsOdds[1].innerText
								// 			})
								// 		// }
								// 		if (homeCheck && awayCheck) {
								// 			fixturesUrls.push(`${matchObject.homeTeam} ${matchObject.awayTeam}`);
								// 		}
								// 		// fixturesUrls.push(teamsNames[0].innerHTML);
								// 	})
								// // })
								// 	// fixturesUrls = test;

								// eventInfo.homeTeam = teamsNames[0].innerHTML;
								// eventInfo.awayTeam = teamsNames[1].innerHTML;
								// eventInfo.odds[0] = teamsOdds[0].innerText;
								// eventInfo.odds[1] = teamsOdds[1].innerText;

								// fixturesUrls.push(eventInfo)

							})
						})
						return leaguesStats;
					}, leaguesStats, bookmakerVaribale)


					// console.log(fixtures[0].fixtures[0])
					// leaguesStats.forEach((item) => {
					// 	item.fixtures.forEach(matchObject => {
					// 		const homeCheck = matchObject.homeTeam.includes(teamsNames[0].innerHTML);
					// 		const awayCheck = matchObject.awayTeam.includes(teamsNames[1].innerHTML);

					// 		if (homeCheck && awayCheck) {
					// 			matchObject.bookmakers.push({
					// 				name: bookmakerVaribale, 
					// 				homeOdd: teamsOdds[0].innerText, 
					// 				awayOdd: teamsOdds[1].innerText
					// 			})
					// 		}
					// 	})
					// })

					leaguesStats = fixtures;
				
				}
				else if (bookmakerVaribale === "8888") {
					/*
					  Wait for dropdown for bet types to load. Then click it and select
					  wanted bet type
					 */
					await page.waitForSelector('._asb_expansion-panel._asb_events-tree-table-node-CH')
					await page.waitForSelector('.asb-flex-sc._asb_events-tree-table-node-CH--expansion-panel-header:not(._asb_events-tree-table-node-SP--expansion-panel-header-opened)')

					// const elements = await page.$$('.asb-flex-sc._asb_simple-button._asb_simple-button-pointer._asb_events-tree-table-node-CH--expansion-panel-header._asb_expansion-panel-header._asb_events-tree-table-node-SP--expansion-panel-title._asb_events-tree-table-node-CH--expansion-panel-title._asb_expansion-panel-title');
					const elements = await page.$$('.asb-flex-sc._asb_events-tree-table-node-CH--expansion-panel-header:not(._asb_events-tree-table-node-SP--expansion-panel-header-opened)');
					//And trigger click event on them to open
					await elements.forEach(async element => {
						console.log(element)
						await element.click();
					});
					// let fixtures = await page.$$eval('.table', (table, leaguesStats, bookmakerVaribale) => {
					// 	const fixturesUrls = [];
						
					// 	table.map(function(e) {
					// 		const matches = e.querySelectorAll('.event--fw');

					// 		matches.forEach((match) => {
					// 			let eventInfo = {
					// 				homeTeam: '',
					// 				awayTeam: '',
					// 				odds: []
					// 			};

					// 			const teamsNames = match.querySelectorAll('.event-header__names .text-truncate.team');
					// 			const teamsOdds = match.querySelectorAll('.event-body.grid-2-cols .btn-odds__odd');

					// 			// leaguesStats.forEach((item) => {
					// 			for (let i = 0; i < leaguesStats[0].fixtures.length; i++) {
					// 				const matchObject = leaguesStats[0].fixtures[i]

					// 				// Add || if the names are reverted
					// 				const homeCheck = matchObject.homeTeam.includes(teamsNames[0].innerHTML);

					// 				// Add || if the names are reverted
					// 				const awayCheck = matchObject.awayTeam.includes(teamsNames[1].innerHTML);


					// 				if (homeCheck && awayCheck) {
					// 					fixturesUrls.push(matchObject)
					// 					matchObject.bookmakers.push({
					// 						name: bookmakerVaribale, 
					// 						// homeOdd: homeCheck, 
					// 						homeOdd: teamsOdds[0].innerText, 
					// 						// awayOdd: awayCheck
					// 						awayOdd: teamsOdds[1].innerText
					// 					})
					// 				}
					// 			}
					// 			// 	const test = leaguesStats[0].fixtures.map(matchObject => {
					// 			// 		const homeCheck = matchObject.homeTeam.includes(teamsNames[0].innerHTML);
					// 			// 		const awayCheck = matchObject.awayTeam.includes(teamsNames[1].innerHTML);

					// 			// 		// if (homeCheck && awayCheck) {
					// 			// 			matchObject.bookmakers.push({
					// 			// 				name: bookmakerVaribale, 
					// 			// 				homeOdd: homeCheck, 
					// 			// 				// homeOdd: teamsOdds[0].innerText, 
					// 			// 				awayOdd: awayCheck
					// 			// 				// awayOdd: teamsOdds[1].innerText
					// 			// 			})
					// 			// 		// }
					// 			// 		if (homeCheck && awayCheck) {
					// 			// 			fixturesUrls.push(`${matchObject.homeTeam} ${matchObject.awayTeam}`);
					// 			// 		}
					// 			// 		// fixturesUrls.push(teamsNames[0].innerHTML);
					// 			// 	})
					// 			// // })
					// 			// 	// fixturesUrls = test;

					// 			// eventInfo.homeTeam = teamsNames[0].innerHTML;
					// 			// eventInfo.awayTeam = teamsNames[1].innerHTML;
					// 			// eventInfo.odds[0] = teamsOdds[0].innerText;
					// 			// eventInfo.odds[1] = teamsOdds[1].innerText;

					// 			// fixturesUrls.push(eventInfo)

					// 		})
					// 	})
					// 	return leaguesStats;
					// }, leaguesStats, bookmakerVaribale)


					// console.log(fixtures[0].fixtures[0])
					// leaguesStats.forEach((item) => {
					// 	item.fixtures.forEach(matchObject => {
					// 		const homeCheck = matchObject.homeTeam.includes(teamsNames[0].innerHTML);
					// 		const awayCheck = matchObject.awayTeam.includes(teamsNames[1].innerHTML);

					// 		if (homeCheck && awayCheck) {
					// 			matchObject.bookmakers.push({
					// 				name: bookmakerVaribale, 
					// 				homeOdd: teamsOdds[0].innerText, 
					// 				awayOdd: teamsOdds[1].innerText
					// 			})
					// 		}
					// 	})
					// })

					// leaguesStats = fixtures;
				}
			}
		}
		console.log(leaguesStats[0].fixtures[0])
		// browser.close();

		return leaguesStats;
	}

	return scrapeData();
}

module.exports = {
	scrapeData
}




