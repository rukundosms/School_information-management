
<?php 
include("connection.php");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <form action="" method="post">
        From year:<select name="from-year" id="">
            <?php
            $year_select=mysqli_query($conn,"SELECT * FROM year where status='active'");
          $a=mysqli_fetch_array($year_select);
           ?>
            <option value="<?php echo $a['year_id']?>"><?php echo $a['year']?></option>
           
        
        </select>

        <button name="promote">Promote</button>

    <?php
    #toselect the current year
    $year_select=mysqli_query($conn,"SELECT * FROM year where status='active'");
    $a=mysqli_fetch_array($year_select);
    $current_year=$a['year_id'];
    #-------------------------------------
    #select students
    if (isset($_POST['promote'])) {
         $from_year=$_POST['from-year'];
       
    $select_students=mysqli_query($conn,"SELECT * FROM student,ranks where student.sid=ranks.sit");
    while ($a_student=mysqli_fetch_array($select_students)) {
        #define student
        $student=$a_student['sid'];
#to check if the student not already promoted
$student_promotion_check=mysqli_query($conn,"SELECT * FROM student_promotion_log where sid='$student' and to_year='$from_year'");
if (mysqli_num_rows($student_promotion_check)<1) {
        $student_class=$a_student['class'];
        $student_program=$a_student['program_id'];

       #select the student yearl marks
       $marks_select=mysqli_query($conn,"SELECT * FROM ranks where sit='$student'");
       $a_marks=mysqli_fetch_array($marks_select);
        $marks=$a_marks['yearl_pass'];
      #select class inorder toget get the level of the class
        $select_class=mysqli_query($conn,"SELECT * FROM class where cid='$student_class' and class_program='$student_program'");
        $a_class=mysqli_fetch_array($select_class);

      #to define password class
        $past_class=$a_class['cid'];

        #to dedine past level
        $past_level=$a_class['class_level'];

        #define next level
        $next_level=$past_level+1;

        #toget past class class program
        $class_program=$a_class['class_program'];

     #to select new class and level

    $from_year=$_POST['from-year'];
  
    $promote=mysqli_query($conn,"INSERT INTO student_promotion_log(sid,total_marks,from_class,to_class,from_year,to_year,
program_id,decision) values ('$student','$marks','$past_class','$past_class','$from_year','$from_year','$class_program','new')");
   
    }
    }
  
 }


    ?>
    </form>
</body>
</html>