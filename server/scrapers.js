const puppeteer = require('puppeteer');
const { writeFile } = require('fs');
const path = './results.json';

async function scrapeData(bookmakers) {

	const browser = await puppeteer.launch({
		headless: false,
		ignoreHTTPSErrors: true,
		args: [`--window-size=1080,900`],
		defaultViewport: {
			width:1080,
			height:900
		}
	});

	const page = await browser.newPage();

	const scrapeData = async () => {
		let leaguesStats = []

		for (let i = 0; i < bookmakers.length; i++) {
			for (let y = 0; y < bookmakers[i].urls.length; y++) {
				await page.goto(bookmakers[i].urls[y], { waitUntil: "load" })
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

				} 
				else if (bookmakerVaribale === "winbet" || bookmakerVaribale === "inbet") {

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
								const teamsOddsBody = match.querySelector('.event-body.grid-2-cols')

								if (teamsOddsBody.classList.contains('event-body--has-change')) {
									return;
								}

								const teamsOdds = teamsOddsBody.querySelectorAll('.btn-odds__odd');

								leaguesStats.forEach((league) => {
									for (let i = 0; i < league.fixtures.length; i++) {
										const matchObject = league.fixtures[i]

										//@TODO Add || if the names are reverted
										const homeCheck = 
											matchObject.homeTeam.includes(teamsNames[0].innerHTML) || 
											teamsNames[0].innerHTML.includes(matchObject.homeTeam); 

										//@TODO Add || if the names are reverted
										const awayCheck = 
											matchObject.awayTeam.includes(teamsNames[1].innerHTML) ||
											teamsNames[1].innerHTML.includes(matchObject.awayTeam);


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
								})
							})
						})
						return leaguesStats;
					}, leaguesStats, bookmakerVaribale)

					leaguesStats = fixtures;
				}
				else if (bookmakerVaribale === "8888") {
					await page.waitForSelector('._asb_expansion-panel._asb_events-tree-table-node-CH')

					//Select all accordions and open them
					const table = await page.$$eval('._asb_expansion-panel._asb_events-tree-table-node-CH', (table) => {
						table.map(async (e) => {
							//Leagues accordions
							const leagueAccordionHeads = await e.querySelectorAll('.asb-flex-sc._asb_events-tree-table-node-CH--expansion-panel-header:not(._asb_events-tree-table-node-SP--expansion-panel-header-opened)')
							await leagueAccordionHeads.forEach((leagueAccordionHead) => {
								leagueAccordionHead.click();
							})

							//Dates accordions
							const calendarAccordionHeads = await e.querySelectorAll('._asb_events-tree-table-node-DT--expansion-panel-title:not(._asb_events-tree-table-node-DT--expansion-panel-header-opened)')
							await calendarAccordionHeads.forEach((calendarAccordionHead) => {
								calendarAccordionHead.click();
							})
						})
					});

					//Wait for bet selector to load
					await page.waitForSelector('._asb_items-dropdown-header')

					//Select wanted bet type
					const controlsHeader = await page.$$eval('._asb_events-table-header-mobile', (button) => {
						button.map(async (e) => {
							const betTypeButton = await e.querySelector('._asb_items-dropdown-header')
							await betTypeButton.click();

							/*
							Select bet type:
							2 == 'Брой голове'
							4 == 'Двата отбора да отбележат'
							5 == 'Равенство няма залог'
							*/
							const dropdownMenu = await e.querySelector('._asb_popup-content>div:nth-child(5)');
							await dropdownMenu.click();
						})
					})

					//Select all matches (rows of match event)
					let fixtures = await page.$$eval('._asb_expansion-panel._asb_events-tree-table-node-SP', (table, leaguesStats, bookmakerVaribale) => {
						const fixturesUrls = [];
						
						table.map(function(e) {
							const matches = e.querySelectorAll('.asb-flex-col.asb-cut.asb-pos-wide');

							matches.forEach((match) => {
								let eventInfo = {
									homeTeam: '',
									awayTeam: '',
									odds: []
								};

								const teamsNames = match.querySelectorAll('.asb-text.asb-pos-wide');
								const teamsOdds = match.querySelectorAll('.asb-flex._asb_prices-market .asb-flex-cc.asb-unshrink._asb_price-block-content-price > span');

								leaguesStats.forEach((league) => {
									for (let i = 0; i < league.fixtures.length; i++) {
										const matchObject = league.fixtures[i]

										//@TODO Add || if the names are reverted
										const homeCheck = 
											matchObject.homeTeam.includes(teamsNames[0].innerHTML) || 
											teamsNames[0].innerHTML.includes(matchObject.homeTeam); 

										//@TODO Add || if the names are reverted
										const awayCheck = 
											matchObject.awayTeam.includes(teamsNames[1].innerHTML) ||
											teamsNames[1].innerHTML.includes(matchObject.awayTeam);


										if (homeCheck && awayCheck) {
											//TODO ?? remove or not ??
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
								})
							})
						})
						return leaguesStats;
					}, leaguesStats, bookmakerVaribale)

					leaguesStats = fixtures;
				}
				else if (bookmakerVaribale === "betano") {
					await page.waitForSelector('.league-page')

					let fixtures = await page.$$eval('.league-page', (table, leaguesStats, bookmakerVaribale) => {
						const matches = document.querySelectorAll('.events-list__grid__event');

						matches.forEach((match) => {
								let eventInfo = {
									homeTeam: '',
									awayTeam: '',
									odds: []
								};

								const teamsNames = match.querySelectorAll('.events-list__grid__info__main__participants__participant-name');
								const teamsOdds = match.querySelectorAll('.table__markets__market:nth-child(3) .selections__selection__odd');

								leaguesStats.forEach((league) => {
									for (let i = 0; i < league.fixtures.length; i++) {
										const matchObject = league.fixtures[i]

										//@TODO Add || if the names are reverted
										const homeCheck = 
											matchObject.homeTeam.includes(teamsNames[0].innerHTML) || 
											teamsNames[0].innerHTML.includes(matchObject.homeTeam); 

										//@TODO Add || if the names are reverted
										const awayCheck = 
											matchObject.awayTeam.includes(teamsNames[1].innerHTML) ||
											teamsNames[1].innerHTML.includes(matchObject.awayTeam);

										if (homeCheck && awayCheck) {
											matchObject.bookmakers.push({
												name: bookmakerVaribale, 
												// homeOdd: homeCheck, 
												homeOdd: teamsOdds[0].innerText, 
												// awayOdd: awayCheck
												awayOdd: teamsOdds[1].innerText
											})
										}
									}
								})
							})

							return leaguesStats;
					}, leaguesStats, bookmakerVaribale)

					leaguesStats = fixtures;


					// console.log(fixtures);

					// for (let i = 0; i < fixtures.length; i ++) {
						
					// 	await page.goto(fixtures[i], { waitUntil: "load" })

					// 	console.log(fixtures[i])
					// }
					// // fixtures.forEach(async (fixure) => {
					// // })

					// //Select wanted bet type
					// const controlsHeader = await page.$$eval('._asb_events-table-header-mobile', (button) => {
					// 	button.map(async (e) => {
					// 		const betTypeButton = await e.querySelector('._asb_items-dropdown-header')
					// 		await betTypeButton.click();

					// 		/*
					// 		Select bet type:
					// 		2 == 'Брой голове'
					// 		4 == 'Двата отбора да отбележат'
					// 		5 == 'Равенство няма залог'
					// 		*/
					// 		const dropdownMenu = await e.querySelector('._asb_popup-content>div:nth-child(5)');
					// 		await dropdownMenu.click();
					// 	})
					// })

					// //Select all matches (rows of match event)
					// // let fixtures = await page.$$eval('._asb_expansion-panel._asb_events-tree-table-node-SP', (table, leaguesStats, bookmakerVaribale) => {
					// // 	const fixturesUrls = [];
						
					// // 	table.map(function(e) {
					// // 		const matches = e.querySelectorAll('.asb-flex-col.asb-cut.asb-pos-wide');

					// // 		matches.forEach((match) => {
					// // 			let eventInfo = {
					// // 				homeTeam: '',
					// // 				awayTeam: '',
					// // 				odds: []
					// // 			};

					// // 			const teamsNames = match.querySelectorAll('.asb-text.asb-pos-wide');
					// // 			const teamsOdds = match.querySelectorAll('.asb-flex._asb_prices-market .asb-flex-cc.asb-unshrink._asb_price-block-content-price > span');

					// // 			leaguesStats.forEach((league) => {
					// // 				for (let i = 0; i < league.fixtures.length; i++) {
					// // 					const matchObject = league.fixtures[i]

					// // 					//@TODO Add || if the names are reverted
					// // 					const homeCheck = 
					// // 						matchObject.homeTeam.includes(teamsNames[0].innerHTML) || 
					// // 						teamsNames[0].innerHTML.includes(matchObject.homeTeam); 

					// // 					//@TODO Add || if the names are reverted
					// // 					const awayCheck = 
					// // 						matchObject.awayTeam.includes(teamsNames[1].innerHTML) ||
					// // 						teamsNames[1].innerHTML.includes(matchObject.awayTeam);


					// // 					if (homeCheck && awayCheck) {
					// // 						fixturesUrls.push(matchObject)
					// // 						matchObject.bookmakers.push({
					// // 							name: bookmakerVaribale, 
					// // 							// homeOdd: homeCheck, 
					// // 							homeOdd: teamsOdds[0].innerText, 
					// // 							// awayOdd: awayCheck
					// // 							awayOdd: teamsOdds[1].innerText
					// // 						})
					// // 					}
					// // 				}
					// // 			})
					// // 		})
					// // 	})
					// // 	return leaguesStats;
					// // }, leaguesStats, bookmakerVaribale)

					// leaguesStats = fixtures;
				}
			}
		}
		// browser.close();

		return leaguesStats;
	}

	return scrapeData();
}

module.exports = {
	scrapeData
}




