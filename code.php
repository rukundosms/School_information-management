<?php
session_start();
include('connection.php');

require 'vendor\autoload.php';

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

if(isset($_POST['save_excel_data']))
{
    $fileName = $_FILES['import_file']['name'];
    $file_ext = pathinfo($fileName, PATHINFO_EXTENSION);

    $allowed_ext = ['xls','csv','xlsx'];


    if(in_array($file_ext, $allowed_ext))
    {
        $inputFileNamePath = $_FILES['import_file']['tmp_name'];
         $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($inputFileNamePath);
        $data = $spreadsheet->getActiveSheet()->toArray();

        $count = "0";
        foreach($data as $row)
        {
            if($count > 0)
            {
                $sid = $row['0'];
                $firstname = $row['1'];
                $lastname = $row['2'];
                $district = $row['3'];
                $secter = $row['4'];
                $trade= $row['5'];
                $class = $row['6'];
                $marks= $row['7'];

                $studentQuery = "INSERT INTO student(sid,firstname,lastname,district,secter,trade,class,marks) VALUES ('$sid','$firstname','$lastname','$district','$secter','trade','class','marks')";
                $result = mysqli_query($con, $studentQuery);

                $msg = true;
            }
            else
            {
                $count = "1";
            }
        }

        if(isset($msg))
        {
            $_SESSION['message'] = "Successfully Imported";
            header('Location: index_Excel.php');
            exit(0);
        }
        else
        {
            $_SESSION['message'] = "Not Imported";
            header('Location: index_Excel.php');
            exit(0);
        }
    }
    else
    {
        $_SESSION['message'] = "Invalid File";
        header('Location: index_Excel.php');
        exit(0);
    }
}
?>