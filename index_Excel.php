<?php

session_start();
include("connection.php");

// Make sure session variables exist
if(!isset($_SESSION['cl']) || !isset($_SESSION['t'])){
    die("Session variables 'cl' or 't' are not set. Please login first.");
}

$class = $_SESSION['cl'];
$trade = $_SESSION['t'];
$select_year=mysqli_query($conn,"SELECT * FROM year where status='active'");
$year_row=mysqli_fetch_array($select_year);
$year=$year_row['year_id'];
$class_select=mysqli_query($conn,"SELECT * FROM class where cid='$class'");
$class_row=mysqli_fetch_array($class_select);
$class_program=$class_row['class_program'];
echo $class_program;
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How to Import Excel Data</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body>

    <div class="container">
        <div class="row">
            <div class="col-md-12 mt-4">

                <?php
                if(isset($_SESSION['message']))

                {
                    echo "<h4>".$_SESSION['message']."</h4>";
                    unset($_SESSION['message']);
                }
                ?>

                <div class="card">
                    <div class="card-header">
                        <h4>please Excel table require to be look like this</h4>
                        <table border='1'>
                            <tr>
                                <th>Fitsrname</th>
                                <th>Lastname</th>
                                <th>District</th>
                                <th>Secter</th>
                            </tr>
                        </table>
                    </div>
                    <div class="card-body">

                        <form action="" method="POST" enctype="multipart/form-data">
                            <input type="file" name="file" class="form-control" /><br><br>
                            <button type="submit" name="upload" class="btn btn-primary mt-3">Import</button>

                        </form>
                        <?php
#calling connection to databasse


# to specify which kind of event occured for to perfom the operation

if (isset($_POST['upload'])) {

   #get file location

   $filename=$_FILES['file']['tmp_name'];

   #calling the external classes(phpexcel.php from phpExcel/classes and IOFactory.php from classes/phpExcel)

require "PHPEXcel/Classes/PHPExcel.php";
require_once "PHPExcel/Classes/PHPExcel/IOFactory.php";

#to create the object tha stand to loaded file(the file loaded sotored in this variable)
 $file=PHPExcel_IOFactory::load($filename);

 #to get rows of once r\loaded file(using getWorksheetIterator() method and froeach for to iteration)
 foreach ($file->getWorksheetIterator() as $worksheet) {

   #variable that contan the max row on the loaded file(using getHighestRow() method)

    $maxrow=$worksheet->getHighestRow();

    #using for loop to iterate oll the rows of loaded sheet file

for ($i=2; $i<=$maxrow ; $i++) { 

   /*toget cells of rows and columns(using getCellByColumnAnd Row(column,row) method and getValue()
    methos to get the vlue of  cell)

   */$fname=$worksheet->getCellByColumnAndRow(0,$i)->getValue();
   $lname=$worksheet->getCellByColumnAndRow(1,$i)->getValue();
   $district=$worksheet->getCellByColumnAndRow(2,$i)->getValue();
   $secter=$worksheet->getCellByColumnAndRow(3,$i)->getValue();

# after to get the values of data will create instertion into database

$insert=mysqli_query($conn,"INSERT INTO student(firstname,lastname,district,secter,trade,class) values('$fname','$lname','$district','$secter','$trade','$class')");
   if ($insert){
            $select_new_student=mysqli_query($conn,"SELECT * FROM student");
            while ($a_student=mysqli_fetch_array($select_new_student)) {
                $new_student=$a_student['sid'];
                $chech_from_promotion=mysqli_query($conn,"SELECT * FROM student_promotion_log where sid='$new_student'");
                if (mysqli_num_rows($chech_from_promotion)<1) {
                    mysqli_query($conn,"INSERT INTO student_promotion_log(sid,from_year,to_year,from_class,to_class,decision,program_id) values('$new_student',
                    '$year','$year','$class','$class','new','$class_program')");
                }
            }
            echo "<script>alert('student list added'),location='student.php'</script>";
        }
        else{
            echo "<script>alert('List not added'),location='student.php'</script>";
        }
                                       
} }}
?>

                    </div>

                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>

</html>
<style>
.card {
    width: 80%;
    height: fit-content;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0px 0px 3px 3px rgb(179, 218, 179);
    text-align: center;
    margin: auto;

}

.card-header {
    width: 80%;
    height: fit-content;
    display: flex;
    flex-direction: column;
    text-align: center;
    background-color: #fff;
    margin: auto;
    padding-bottom: 10px;
    border-radius: 5px;
}

.card-body {
    width: 80%;
    display: flex;
    flex-direction: column;
    margin-top: 10px;
}

button {
    font-size: 20px;
    font-weight: bold;
    background-color: rgb(13, 190, 13);
    color: #fff;
    border-radius: 3px;
    cursor: pointer;
    padding: 5px;
    margin-top: 10px;
    border: none;
}

h4 {
    height: fit-content;
    padding: 5px;


}

table {
    font-size: 14px;
    width: 80%;
    margin-top: -10px;
    margin: auto;
    border: none;
}

input {
    margin-top: 10px;
}
</style>