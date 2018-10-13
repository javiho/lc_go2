package main

import (
	"time"
	"log"
	"strconv"
)

/**

CREATE TABLE note(id TEXT, text TEXT, start TEXT, end TEXT, color TEXT, life_id INTEGER, FOREIGN KEY(life_id) REFERENCES life(id))

CREATE TABLE life(id INTEGER, start TEXT, end TEXT)

CREATE TABLE life_options(id, life_id INTEGER, life_id FOREIGN KEY(life_id) REFERENCES life(id))

INSERT INTO life VALUES (1, "1995-01-01 00:00:00.000", "2080-01-01 00:00:00.000")

INSERT INTO note VALUES ("hcNote1", "Nn 1", "2017-02-15 00:00:00.000", "2017-04-01 00:00:00.000", "#0000ff", 1)
INSERT INTO note VALUES ("hcNote2", "Nn 2", "2018-11-01 00:00:00.000", "2018-11-15 00:00:00.000", "#00ff00", 1)

ALTER TABLE LIFE ADD COLUMN NAME TEXT;

DROP TABLE life;
CREATE TABLE life(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, start TEXT, end TEXT);
INSERT INTO life(name, start, end) VALUES ("nimi", "1995-01-01 00:00:00.000", "2080-01-01 00:00:00.000");

 */

type Note struct{
	Text string
	Start time.Time
	End time.Time
	Color string
	Id string
}

type Category struct{
	Name string
}

type TimeUnit int

// There doesn't appear to be anything like these constants in the time package.
const(
	Day TimeUnit = iota
	Week
	Month
	Year
)

const yyMMddLayout = "2006-01-02"
const dbDateLayout = "2006-01-02 15:04:05.000"
const defaultNoteText = "(Unnamed note)"
var defaultStartDate = time.Date(1980, time.January, 1, 0, 0, 0, 0, time.UTC)
var defaultEndDate = time.Date(2060, time.July, 15, 0, 0, 0, 0, time.UTC)

type Life struct{
	DatabaseId int
	Start time.Time
	End time.Time
	Notes []*Note
}

/*
// TODO: Miksi compiler sallii tämän? Koska kyseiset constantit ovat inttejä?
var timeUnitNamesArr = []string{
	Day: "Day",
	Week: "Week",
	Month: "Month",
	Year: "Year",
}*/

// TODO: Miten voi tehdä niin, että kovakoodaa time unitit ja niiden stringit vain kerran?
var timeUnitStrings = []string{"Day", "Week", "Month", "Year"}
var timeUnitFromString = map[string]TimeUnit{
	"Day": Day,
	"Week": Week,
	"Month": Month,
	"Year": Year,
}

/*func getAllTimeUnitStrings() []string{
	tuStrings := []string{}
	for k, _ := range timeUnitFromString{
		tuStrings = append(tuStrings, k)
	}
	return tuStrings
}*/

func getStringFromTimeUnit(tu TimeUnit) string{
	for k, v := range timeUnitFromString{
		if tu == v{
			return k
		}
	}
	log.Panic("Erroneous parameter: ", tu)
	return ""
}

func getNotesByInterval(life *Life, start time.Time, end time.Time) []*Note{
	/*
	Pre-condition start < end (ENTÄ JOS ON SAMA?). life.start < life.end
	 */
	/*
	käy läpi kaikki notet lifessä
		jos ne > is ja ns < ie
	 */
	var notesInInterval []*Note
	for _, n := range life.Notes{
		if n.End.After(start) && n.Start.Before(end){
			notesInInterval = append(notesInInterval, n)
		}
	}
	//fmt.Println("getting notes by interval ", start, " to ", end, ". Notes returned: ", len(notesInInterval))
	return notesInInterval
}

func (l Life) doesNoteExist(id string) bool{
	for _, n := range l.Notes{
		if n.Id == id{
			return true
		}
	}
	return false
}

func (l Life) getNoteById(id string) *Note{
	// TODO: PITÄISI MIELUUMMIN Notes-attribuutin olla map kuin käyttää tämmöistä luuppia. ID:iden uniikkiuskin olisi taattu.
	for _, n := range l.Notes{
		if n.Id == id{
			return n
		}
	}
	log.Panic("Note not found of id ", id)
	return &Note{}
}

func (l *Life) replaceNote(newNote *Note) {
	for i, n := range l.Notes{
		if n.Id == newNote.Id{
			l.Notes[i] = newNote
			break
		}
	}
}

func (l *Life) addNote(newNote *Note){
	l.Notes = append(l.Notes, newNote)
}

func (l *Life) deleteNote(deletedNote *Note){
	// TODO: Jos toteuttaisi sort-packagen interfacen tai jotain niin voisi tehdä helpommin?
	var indexOfNote int
	found := false
	for i, note := range l.Notes{
		if note == deletedNote{
			indexOfNote = i
			found = true
			break
		}
	}
	if found == false{
		log.Panic("erroneous note")
	}
	l.Notes = append(l.Notes[:indexOfNote], l.Notes[indexOfNote+1:]...)
}

func (n Note) StartAsString() string{
	/*
	Returns start as string which can be inserted to HTML date input element.
	 */
	return n.Start.Format(yyMMddLayout)
}

func (n Note) EndAsString() string{
	return n.End.Format(yyMMddLayout)
}

func (tb TimeBox) IntervalAsPresentableString(resolutionUnitString string) string{
	resolutionUnit := timeUnitFromString[resolutionUnitString]
	return intervalToPresentableString(tb.Start, tb.End, resolutionUnit)
}

func intervalToPresentableString(d1 time.Time, exclusiveD2 time.Time, resolutionUnit TimeUnit) string{
	/*
	Precondition: if resolutionUnit == Day, d1 == d2.
	(date1, date2, Day) -> 01.01.2018
	(date1, date2, Week) -> Week 1 of 2018 (vuodenvaihteessa ks. https://golang.org/pkg/time/#Time.ISOWeek)
	(date1, date2, Month) -> 1/2018
	year no mikäköhän
	 */
	d2 := exclusiveD2.AddDate(0, 0, -1) // Now d1 and d2 should be in same resolutionUnit.
	if resolutionUnit == Day{
		if d1 != d2{
			log.Panic("resolutionUnit == Day, d1 != d2")
		}
		return d1.Format(yyMMddLayout)
	}else if resolutionUnit == Week{
		year, week := d1.ISOWeek()
		_, week2 := d2.ISOWeek()
		if week != week2{
			log.Panic("dates in different week")
		}
		return strconv.Itoa(year) + "W" + strconv.Itoa(week)
	}else if resolutionUnit == Month{
		year, month, _ := d1.Date()
		_, month2, _ := d2.Date()
		if month != month2{
			log.Panic("dates in different month")
		}
		return strconv.Itoa(int(month)) + "/" + strconv.Itoa(year)
	}else if resolutionUnit == Year{
		year, _, _ := d1.Date()
		year2, _, _ := d2.Date()
		if year != year2{
			log.Panic("dates in different year")
		}
		return strconv.Itoa(year)
	}
	log.Panic("bug")
	return ""
}