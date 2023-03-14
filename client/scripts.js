let dataJSON = []
const container = document.querySelector('.container');

function submitChannel() {
	fetch('http://localhost:3000/creators', {
		method: 'POST',
	})
}

function newEl(type, attrs={}) {
	const el = document.createElement(type);
	for (let attr in attrs) {
		const value = attrs[attr];
		if (attr == 'innerText') el.innerText = value;
		else el.setAttribute(attr, value);
	}
	return el;
}

async function loadCreators() {
	const res = await fetch('http://localhost:3000/creators');
	const creators = await res.json();

	container.innerHTML = '';

	calculation(creators, 'all')

	dataJSON = creators

	$('.js-split-btn').addClass('is-shown')

	sortEventListener()
}

function homeResults() {
	container.innerHTML = '';

	calculation(dataJSON, 'home')

	sortEventListener()
}

function awayResults() {
	container.innerHTML = '';

	calculation(dataJSON, 'away')

	sortEventListener()
}

function sortTournaments(team) {
	let domesticLeague = []
	let domesticLeagueFlag = false

	let euroTurnaments = []
	let euroTurnamentsFlag = false

	let otherTurnaments = []
	let otherTurnamentsFlag = false

	for (let i = 0; i < team.table.length; i++) {
		const pattern = /[^0-9]/g;

		if (team.table[i] == "ENGLAND\nPremier League\nStandings" 
			|| team.table[i] == "SPAIN\nLaLiga\nStandings" 
			|| team.table[i] == "GERMANY\nBundesliga\nStandings" 
			|| team.table[i] == "ITALY\nSerie A\nStandings" 
			|| team.table[i] == "FRANCE\nLigue 1\nStandings"
			) {
			domesticLeagueFlag = true
			euroTurnamentsFlag = false
			otherTurnamentsFlag = false
			continue
		} else if (team.table[i].includes("EUROPE")) {
			domesticLeagueFlag = false
			euroTurnamentsFlag = true
			otherTurnamentsFlag = false
			continue
		} else if (team.table[i].slice(0, 1).match(pattern)) {
			domesticLeagueFlag = false
			euroTurnamentsFlag = false
			otherTurnamentsFlag = true
			continue
		}

		if(domesticLeagueFlag) {
			domesticLeague.push(team.table[i])
		} else if (euroTurnamentsFlag) {
			euroTurnaments.push(team.table[i])
		} else if (otherTurnamentsFlag) {
			otherTurnaments.push(team.table[i])
		}
	}

	return {domesticLeague, euroTurnaments, otherTurnaments};
}

function calculation(fixturesObject, typeOfMatch) {
	let test = 0

	fixturesObject.forEach((item) => {
		test += item.fixtures.length

		item.fixtures.forEach(fixture => {
			let bestHomeOdd = 0
			let bestHomeOddBookmaker = ''
			let bestAwayOdd = 0
			let bestAwayOddBookmaker = ''

			fixture.bookmakers.forEach((bookmaker) => {
				if (bookmaker.homeOdd > bestHomeOdd) {
					bestHomeOdd = bookmaker.homeOdd
					bestHomeOddBookmaker = bookmaker.name
				}

				if (bookmaker.awayOdd > bestAwayOdd) {
					bestAwayOdd = bookmaker.awayOdd
					bestAwayOddBookmaker = bookmaker.name
				}
			})

			console.log(((1 / bestHomeOdd) + (1 / bestAwayOdd)))

			if (((1 / bestHomeOdd) + (1 / bestAwayOdd)) < 1) {
				console.log(((1 / bestHomeOdd) + (1 / bestAwayOdd)))
				console.log(fixture.homeTeam)
				console.log(fixture.awayTeam)
				console.log(fixture.eventDate)
				console.log(bestHomeOddBookmaker)
				console.log(bestAwayOddBookmaker)
			}
		})
	})

	console.log(test)
}

function sortEventListener() {
	$('th').click(function(){
		var table = $(this).closest('table')
		var rows = table.find('tr:gt(0)').toArray().sort(comparer($(this).index()))
		this.asc = !this.asc
		if (!this.asc){rows = rows.reverse()}
		for (var i = 0; i < rows.length; i++){table.find('.js-sort-table').append(rows[i])}
	})
}

function comparer(index) {
	return function(a, b) {
		var valA = getCellValue(a, index)
		var valB = getCellValue(b, index)

		if (index > 0) {
			return parseFloat(valA) - parseFloat(valB)
		} else {
			const stringA = valA.split(' ')
			const stringB = valB.split(' ')
			
			stringA.shift()
			stringB.shift()

			stringA.join(' ')
			stringB.join(' ')

			return stringA.toString().localeCompare(stringB)
		}
	}
}

function getCellValue(row, index){ return $(row).children('td').eq(index).text() }
