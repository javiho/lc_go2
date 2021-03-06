package main

import (
	"database/sql"
	"time"
	"fmt"
	"log"
	_ "github.com/mattn/go-sqlite3"
	"errors"
)

var Db *sql.DB

type LifeSummary struct{
	Id int
	Name string
}

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
	Pre-condition: life with id lifeId exists in the database.
 */
func loadLifeData(lifeId int) *Life{
	db := Db
	stmt, err := db.Prepare("SELECT id, name, start, end FROM life WHERE id = ?;")
	checkDbErr(err)
	rows, err := stmt.Query(lifeId)
	checkDbErr(err)
	lifeFound := false
	var newLife Life
	defer rows.Close()
	for rows.Next() {
		var id int
		var name string
		var startDateString string
		var endDateString string
		err = rows.Scan(&id, &name, &startDateString, &endDateString)
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
		newLife = Life{id, name, startDate, endDate, nil}
		lifeFound = true
	}
	if !lifeFound{
		panic(errors.New("no life of found with the id passed as argument"))
	}
	err = rows.Err()
	checkDbErr(err)
	lifeNotes := fetchNotes(lifeId)
	newLife.Notes = lifeNotes
	return &newLife
}

func getDefaultLifeId() int{
	db := Db
	stmt, err := db.Prepare("SELECT id FROM life;")
	checkDbErr(err)
	rows, err := stmt.Query()
	checkDbErr(err)
	lifeFound := false
	defer rows.Close()
	var id int
	for rows.Next() {
		err = rows.Scan(&id)
		if err != nil{
			log.Fatal(err)
		}
		lifeFound = true
		break
	}
	if !lifeFound{
		panic(errors.New("no lives found"))
	}
	err = rows.Err()
	checkDbErr(err)
	return id
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

func addNoteToDb(note Note, life *Life){
	db := Db
	stmt, err := db.Prepare("INSERT INTO note (id, text, start, end, color, life_id) VALUES (?, ?, ?, ?, ?, ?);")
	checkDbErr(err)
	startAsString := note.Start.Format(dbDateLayout)
	endAsString := note.End.Format(dbDateLayout)
	_, err = stmt.Exec(note.Id, note.Text, startAsString, endAsString, note.Color, life.DatabaseId)
	checkDbErr(err)
	fmt.Println("added note to db")
}

func deleteNoteFromDb(note Note){
	db := Db
	stmt, err := db.Prepare("DELETE FROM note WHERE id = ?;")
	checkDbErr(err)
	_, err = stmt.Exec(note.Id)
	checkDbErr(err)
	fmt.Println("deleted note from db")
}

func updateNoteInDb(note Note){
	db := Db
	stmt, err := db.Prepare("UPDATE note SET text=?, start=?, end=?, color=? WHERE id=?;")
	checkDbErr(err)
	startAsString := note.Start.Format(dbDateLayout)
	endAsString := note.End.Format(dbDateLayout)
	_, err = stmt.Exec(note.Text, startAsString, endAsString, note.Color, note.Id)
	checkDbErr(err)
	fmt.Println("updated note in db")
}

func updateLifeInDb(life Life){
	db := Db
	stmt, err := db.Prepare("UPDATE life SET start=?, end=? WHERE id=?;")
	checkDbErr(err)
	startAsString := life.Start.Format(dbDateLayout)
	endAsString := life.End.Format(dbDateLayout)
	_, err = stmt.Exec(startAsString, endAsString, life.DatabaseId)
	checkDbErr(err)
	fmt.Println("updated life in db")
}

func updateLifeNameInDb(lifeId int, lifeName string){
	db := Db
	stmt, err := db.Prepare("UPDATE life SET name = ? WHERE id=?;")
	checkDbErr(err)
	_, err = stmt.Exec(lifeName, lifeId)
	checkDbErr(err)
	fmt.Println("updated life name in db")
}

func addLifeToDb(name string, start time.Time, end time.Time){
	db := Db
	stmt, err := db.Prepare("INSERT INTO life (name, start, end) VALUES (?, ?, ?);")
	checkDbErr(err)
	startAsString := start.Format(dbDateLayout)
	endAsString := end.Format(dbDateLayout)
	_, err = stmt.Exec(name, startAsString, endAsString)
	checkDbErr(err)
	fmt.Println("added life to db")
}

func deleteLifeFromDb(lifeId int){
	db := Db
	stmt, err := db.Prepare("DELETE FROM life WHERE id = ?;")
	checkDbErr(err)
	_, err = stmt.Exec(lifeId)
	checkDbErr(err)
	fmt.Println("deleted life from db")
}

/*
	Returns life ids and life names.
 */
func listLives() []LifeSummary {
	db := Db
	stmt, err := db.Prepare("SELECT id, name FROM life")
	checkDbErr(err)
	rows, err := stmt.Query()
	checkDbErr(err)
	defer rows.Close()
	var lives []LifeSummary
	for rows.Next(){
		var id int
		var name string
		err = rows.Scan(&id, &name)
		if err != nil{
			log.Fatal(err)
		}
		newLifeSummary := LifeSummary{id, name}
		lives = append(lives, newLifeSummary)
	}
	err = rows.Err()
	checkDbErr(err)
	return lives
}

func doesLifeExist(lifeId int) bool{
	lives := listLives()
	for _, life := range lives{
		if life.Id == lifeId{
			return true
		}
	}
	return false
}

func checkDbErr(err error){
	if err != nil{
		log.Println("Databse error:")
		log.Fatal(err)
	}
}