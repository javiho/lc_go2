package main

import (
	"log"
	"github.com/gorilla/mux"
	"net/http"
	"encoding/json"
	"flag"
	"fmt"
	"time"
	"github.com/kjk/betterguid"
	"html/template"
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
)

type NoteBox struct{
	Note *Note
	Id string // Not the same thing as Note.Id
}

type TimeBox struct {
	Start time.Time
	End   time.Time
	//Notes []Note
	NoteBoxes []NoteBox
}

/*type LcPageVariables struct{
	TimeBoxes []TimeBox
	Notes []*Note
	LifeStart string
	LifeEnd string
	ResolutionUnit string
	AllResolutionUnits []string
	NoteVisibilities map[*Note]bool
	TrueTime time.Time
	Errors []string
}*/

// ResolutionUnit and VisibleNotes are only for displaying data.
// TODO: ne voisivat olla samassa structissa?
var ResolutionUnit TimeUnit
var NoteVisibilities map[*Note]bool
//var VisibleNotes *list.List

var TheLife *Life

type LcMainPageVariables struct{
	ResolutionUnit string
	AllResolutionUnits []string
	Life *Life
}

type Person struct {
ID        string   `json:"id,omitempty"`
Firstname string   `json:"firstname,omitempty"`
Lastname  string   `json:"lastname,omitempty"`
Address   *Address `json:"address,omitempty"`
}
type Address struct {
	City  string `json:"city,omitempty"`
	State string `json:"state,omitempty"`
}

var people []Person

func main() {
	log.Println("hello")
	/*people = append(people, Person{ID: "1", Firstname: "John", Lastname: "Doe", Address: &Address{City: "City X", State: "State X"}})
	people = append(people, Person{ID: "2", Firstname: "Koko", Lastname: "Doe", Address: &Address{City: "City Z", State: "State Y"}})
	people = append(people, Person{ID: "3", Firstname: "Francis", Lastname: "Sunday"})*/

	id := betterguid.New()
	fmt.Println("id: ", id)
	loadDataFromDatabase()
	initializeData()
	fmt.Println("data initialized")

	var dir string
	flag.StringVar(&dir, "dir", ".", "the directory to serve files from. Defaults to the current dir")
	flag.Parse()

	router := mux.NewRouter()
	fmt.Println(dir)
	
	router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./src/main/static"))))
	router.HandleFunc("/", GetMainPage).Methods("GET")
	router.HandleFunc("/get_main_page_data", GetMainPageData).Methods("GET")
	router.HandleFunc("/get_life", GetLife).Methods("GET")
	router.HandleFunc("/change_note", ChangeNote).Methods("POST")
	router.HandleFunc("/add_note", AddNote).Methods("POST")
	router.HandleFunc("/delete_note", DeleteNote).Methods("POST")
	router.HandleFunc("/change_options", ChangeLcOptions).Methods("PUT")
	router.HandleFunc("/people", GetPeople).Methods("GET")
	router.HandleFunc("/people/{id}", GetPerson).Methods("GET")
	router.HandleFunc("/people/{id}", CreatePerson).Methods("POST")
	router.HandleFunc("/people/{id}", DeletePerson).Methods("DELETE")
	srv := &http.Server{
		Handler:      router,
		Addr:         "127.0.0.1:8080",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}
	log.Fatal(srv.ListenAndServe())
}

/*
	Fetches life data from database and writes it to Life variable.
 */
func loadLifeData(db *sql.DB){
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
	lifeNotes := fetchNotes(db, lifeId)
	newLife.Notes = lifeNotes
	TheLife = &newLife
}

func fetchNotes(db *sql.DB, lifeId int) []*Note{
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

func loadDataFromDatabase(){
	// dataSourceName's root location is src folder
	db, err := sql.Open("sqlite3", "./testdb1.db")
	checkDbErr(err)
	loadLifeData(db)
	//stmt, err := db.Prepare("SELECT * FROM table1;")
	//checkDbErr(err)
	//rows, err := stmt.Query()
	//checkDbErr(err)
	//fmt.Println("result:")
	//fmt.Println(rows)

	//defer rows.Close()
	//for rows.Next() {
	//	var a string
	//	var b string
	//	err = rows.Scan(&a, &b)
	//	fmt.Println(a, b)
	//}
	//err = rows.Err() // get any error encountered during iteration
	//if err != nil{
	//	log.Fatal(err)
	//}

	defer db.Close()
}

func checkDbErr(err error){
	if err != nil{
		log.Println("Databse error:")
		log.Fatal(err)
		//log.Println(err)
		//panic(err)
	}
}

/*func main(){
	id := betterguid.New()
	fmt.Println("id: ", id)
	initializeData()
	fmt.Println("data initialized")

	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("./src/main/static"))))
	http.HandleFunc("/favicon.ico", SendNothing)
	http.HandleFunc("/", SendDefaultView)
	http.HandleFunc("/note_changed", ChangeAndSendCalendar)
	http.HandleFunc("/note_added", AddNoteAndSendCalendar)
	http.HandleFunc("/lc_options_changed", ChangeLcOptionsAndSendCalendar)
	log.Fatal(http.ListenAndServe(":8080", nil))
}*/

func initializeData() {
	ResolutionUnit = Month
	//NoteVisibilities = make(map[*Note]bool)

	//notes := []*Note{
	//	&Note{"Nn 1", time.Date(2017, time.February, 15, 0,0,0,0,time.UTC),
	//		time.Date(2017, time.April, 1, 0,0,0,0,time.UTC), "#0000ff", "hcNote1"},
	//	&Note{"Nn 2", time.Date(2018, time.November, 1, 0,0,0,0,time.UTC),
	//		time.Date(2018, time.November, 15, 0,0,0,0,time.UTC), "#00ff00", "hcNote2"},
	//}
	//TheLife = &Life{time.Date(1995, time.January, 1, 0, 0, 0, 0, time.UTC),
	//	time.Date(2080, time.January, 1, 0, 0, 0, 0, time.UTC),
	//	notes}

	loadDataFromDatabase()

	//makeAllNotesVisible(TheLife)
}

func GetMainPage(w http.ResponseWriter, r *http.Request){
	pageVariables := getLcMainPageVariables()
	t, err := template.ParseFiles("src/main/main_view.html")
	if err != nil{
		panic(err)
	}
	err = t.Execute(w, pageVariables)
	if err != nil{
		panic(err)
	}
}

func GetLife(w http.ResponseWriter, r *http.Request){
	json.NewEncoder(w).Encode(TheLife)
}

func GetMainPageData(w http.ResponseWriter, r *http.Request){
	json.NewEncoder(w).Encode(getLcMainPageVariables());
}

func ChangeLcOptions(w http.ResponseWriter, r *http.Request){
	r.ParseForm()
	fmt.Println(r.Form)
	resolutionUnitString := r.Form["resolution-unit"][0]
	lifeStart, err1 := time.Parse(yyMMddLayout, r.Form["life-start"][0])
	lifeEnd, err2 := time.Parse(yyMMddLayout, r.Form["life-end"][0])
	if err1 != nil || err2 != nil{
		log.Println("parse error")
		http.Error(w, "Parse error.", 500);
		return
	}
	if lifeEnd.Before(lifeStart) || lifeEnd.Equal(lifeStart){
		log.Println("erroneous date values: erroneous chronology")
		http.Error(w, "Start date must be before end date.", 500);
		return
	}

	resolutionUnit := timeUnitFromString[resolutionUnitString] // TODO: entä jos on virheellinen stringi?
	//fmt.Println("new resolution unit:", resolutionUnit)
	ResolutionUnit = resolutionUnit
	TheLife.Start = lifeStart
	TheLife.End = lifeEnd
	json.NewEncoder(w).Encode(getLcMainPageVariables())
}

func ChangeNote(w http.ResponseWriter, r *http.Request) {
	r.ParseForm()
	fmt.Println(r.Form)
	noteId := r.Form["id"][0]
	var note *Note
	if TheLife.doesNoteExist(noteId){
		note = TheLife.getNoteById(noteId)
	}else{
		log.Println("note id of ", noteId, "doesn't exist")
		http.Error(w, "No valid note selected.", 500)
		return
	}
	fmt.Println("Trying to save note")
	noteText := r.Form["text"][0]
	if noteText == ""{
		log.Println("empty note text, not allow'd!")
		http.Error(w, "Note text can't be empty.", 500);
		return
	}
	colorHexString := r.Form["color"][0]
	startDate, err1 := time.Parse(yyMMddLayout, r.Form["start-date"][0])
	endDate, err2 := time.Parse(yyMMddLayout, r.Form["end-date"][0])
	if err1 != nil || err2 != nil{
		log.Println("parse error")
		http.Error(w, "Unparsable date.", 500);
	}
	if endDate.Before(startDate) || endDate.Equal(startDate){
		log.Println("erroneous date values")
		http.Error(w, "End date not after start date.", 500)
		return
	}
	note.Text = noteText
	note.Color = colorHexString
	note.Start = startDate
	note.End = endDate
	json.NewEncoder(w).Encode(getLcMainPageVariables())
}

func AddNote(w http.ResponseWriter, r *http.Request){
	r.ParseForm()
	fmt.Println(r.Form)
	noteText := r.Form["note-text"][0]
	if noteText == ""{
		log.Println("empty note text, not allow'd!")
		http.Error(w, "Note text can't be empty.", 500);
		return
	}
	colorHexString := r.Form["note-color"][0] // TODO: validointi?
	startDate, err1 := time.Parse(yyMMddLayout, r.Form["note-start"][0])
	endDate, err2 := time.Parse(yyMMddLayout, r.Form["note-end"][0])
	if err1 != nil || err2 != nil{
		log.Println("parse error")
		http.Error(w, "Unparsable date.", 500);
		return
	}

	if endDate.Before(startDate) || endDate.Equal(startDate){
		log.Println("erroneous date values")
		http.Error(w, "End date not after start date.", 500);
		return
	}
	note := Note{noteText, startDate, endDate, colorHexString, betterguid.New()}
	TheLife.addNote(&note)
	fmt.Println("note added with id: ", note.Id)
	json.NewEncoder(w).Encode(getLcMainPageVariables())
}

func DeleteNote(w http.ResponseWriter, r *http.Request){
	fmt.Println("DeleteNote called")
	r.ParseForm()
	fmt.Println(r.Form)
	noteId := r.Form["id"][0]
	var note *Note
	if TheLife.doesNoteExist(noteId){
		note = TheLife.getNoteById(noteId)
	}else{
		log.Println("note id of ", noteId, "doesn't exist")
		http.Error(w, "No valid note selected.", 500)
		return
	}
	fmt.Println("Trying to delete note")
	TheLife.deleteNote(note)
	fmt.Println("note deletion done")
	json.NewEncoder(w).Encode(getLcMainPageVariables())
}



func getLcMainPageVariables() LcMainPageVariables{
	return LcMainPageVariables{getStringFromTimeUnit(ResolutionUnit), timeUnitStrings, TheLife}
}


func GetPeople(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(people)
}
func GetPerson(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	for _, item := range people {
		if item.ID == params["id"]{
			json.NewEncoder(w).Encode(item)
		}
	}
}
func CreatePerson(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	var person Person
	_ = json.NewDecoder(r.Body).Decode(&person)
	person.ID = params["id"]
	people = append(people, person)
	json.NewEncoder(w).Encode(people)
}
func DeletePerson(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	for index, item := range people {
		if item.ID == params["id"] {
			people = append(people[:index], people[index+1:]...)
			break
		}
	}
	json.NewEncoder(w).Encode(people)
}