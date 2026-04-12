<?php
include("connection.php");
$file=$_FILES['file']['tmp_name'];
require "PHPExcel/Classes/PHPExcel.php";
require_once "PHPExcel/Classes/PHPExcel/IOFactory.php";
$objexcel=PHPExcel_IOFactory::load($file);
foreach ($objexcel->getWorksheetIterator() as $worksheet) {
    $highestrow=$worksheet->getHighestRow();
    for($row=2;$row<=$highestrow;$row++){

        $name=$worksheet->getCellByColumnAndRow(0,$row)->getValue();
        $email=$worksheet->getCellByColumnAndRow(1,$row)->getValue();
        if ($email != '') {
            $query="INSERT INTO user(name,email) values('$name','$email')";
            $insewrt=mysqli_query($conn,$query);
        }
    }
}
header("location:student.html");
?>