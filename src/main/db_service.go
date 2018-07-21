package main

import (
	"database/sql"
	"time"
	"fmt"
	"log"
	_ "github.com/mattn/go-sqlite3"
)

var Db *sql.DB

func initializeDbService(){
	// dataSourceName's root location is src folder
	db, err := sql.Open("sqlite3", "./testdb1.db")
	checkDbErr(err)
	Db = db
}

func closeDatabase(){
	Db.Close()
}

/*
	Fetches life data from database and returns it as Life object.
 */
func loadLifeData() *Life{
	db := Db
	lifeId := 1
	stmt, err := db.Prepare("SELECT * FROM life WHERE id = ?;")
	checkDbErr(err)
	rows, err := stmt.Query(lifeId)
	checkDbErr(err)
	var newLife Life
	defer rows.Close()
	for rows.Next() {
		var id int
		var startDateString string
		var endDateString string
		err = rows.Scan(&id, &startDateString, &endDateString)
		if err != nil{
			log.Fatal(err)
		}
		startDate, err := time.Parse(dbDateLayout, startDateString)
		if err != nil{
			log.Fatal(err)
		}
		endDate, err := time.Parse(dbDateLayout, endDateString)
		if err != nil{
			log.Fatal(err)
		}
		fmt.Println("life data raw row:")
		fmt.Println(id, startDateString, endDateString)
		fmt.Println("refined dates:")
		fmt.Println(startDate, endDate)
		newLife = Life{startDate, endDate, nil}
	}
	err = rows.Err()
	checkDbErr(err)
	lifeNotes := fetchNotes(lifeId)
	newLife.Notes = lifeNotes
	return &newLife
}

func fetchNotes(lifeId int) []*Note{
	db := Db
	stmt, err := db.Prepare("SELECT * FROM note WHERE life_id = ?;")
	checkDbErr(err)
	rows, err := stmt.Query(lifeId)
	checkDbErr(err)
	defer rows.Close()
	var notes []*Note
	for rows.Next() {
		var id string
		var text string
		var startDateString string
		var endDateString string
		var color string
		var unusedVariable string
		err = rows.Scan(&id, &text, &startDateString, &endDateString, &color, &unusedVariable)
		if err != nil{
			log.Fatal(err)
		}
		startDate, err := time.Parse(dbDateLayout, startDateString)
		if err != nil{
			log.Fatal(err)
		}
		endDate, err := time.Parse(dbDateLayout, endDateString)
		if err != nil{
			log.Fatal(err)
		}
		fmt.Println("note data raw row:")
		fmt.Println(id, startDateString, endDateString, color)
		fmt.Println("refined note dates:")
		fmt.Println(startDate, endDate)
		newNote := &Note{text, startDate, endDate, color, id}
		notes = append(notes, newNote)
	}
	err = rows.Err()
	checkDbErr(err)
	return notes
}

func checkDbErr(err error){
	if err != nil{
		log.Println("Databse error:")
		log.Fatal(err)
		//log.Println(err)
		//panic(err)
	}
}