<?php 
include("connection.php");
session_start(); 

$class=$_SESSION['cl'];
$trade=$_SESSION['t'];
$branch=$_SESSION['branch'];
$branch=mysqli_query($conn,"SELECT * from brach where trade='$trade' and lever='$class'");
   $b=mysqli_num_rows($branch);
   if ($b>0) {
    header("location:branc.php");
   }
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
                            <tr><th>Fitsrname</th><th>Lastname</th><th>District</th><th>Secter</th></tr>
                        </table>
                    </div>
                    <div class="card-body">

                        <form action="" method="POST" enctype="multipart/form-data">
                            <input type="file" name="file" class="form-control" /><br><br>
                            <button type="submit" name="upload" class="btn btn-primary mt-3">Import</button>

                        </form>
                        <?php
                        if (isset($_POST['upload'])){
                        $file=$_FILES['file']['tmp_name'];
                        require "PHPExcel/Classes/PHPExcel.php";
                        require_once "PHPExcel/Classes/PHPExcel/IOFactory.php";
                        $objexcel=PHPExcel_IOFactory::load($file);
                        foreach ($objexcel->getWorksheetIterator() as $worksheet) {
                            $highestrow=$worksheet->getHighestRow();
                            for($row=2;$row<=$highestrow;$row++){
                        
                                $fname=$worksheet->getCellByColumnAndRow(0,$row)->getValue();
                                $lname=$worksheet->getCellByColumnAndRow(1,$row)->getValue();
                                $district=$worksheet->getCellByColumnAndRow(2,$row)->getValue();
                                $secter=$worksheet->getCellByColumnAndRow(3,$row)->getValue();
                                if ($fname != '') {
                                    $query="INSERT INTO student(firstname,lastname,district,secter,trade,class,branch) values('$fname','$lname','$district','$secter','$trade','$class','$branch')";
                                    $insert=mysqli_query($conn,$query);
                                }
                            }
                        }
                        header("location:student.php");
                    }
                        
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
    .card{
        width: 80%;
        height: fit-content;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0px 0px 3px 3px rgb(179, 218, 179);
        text-align: center;
        margin: auto;
        
    }
    .card-header{
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
    .card-body{
        width: 80%;
        display: flex;
        flex-direction: column;
        margin-top: 10px;
    }
    button{
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
    h4{
        height: fit-content;
        padding: 5px;
       
    
    }
    table{
        font-size: 14px;
        width: 80%;
        margin-top: -10px;
        margin: auto;
        border: none;
    }
    input{
        margin-top: 10px;
    }


</style>