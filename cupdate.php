<?php
include("connection.php");
$class=$_GET['id'];
$select=mysqli_query($conn,"SELECT * FROM class,programs where programs.program_id=class.class_program and class.cid='$class'");
while ($a=mysqli_fetch_array($select)) {
    ?>
    <form action="" method="post">
    <div class="cont">
    <h1>Level update</h1>
        <div class="info">
        <span>class Name<sup>*</sup></span><br>
        <input type="text" name="name" value="<?php echo $a['level']?>"><br>
          <span>Class Program<sup>*</sup></span><br>
       <select name="program" id="">
      <option value="<?php echo $a['program_id']?>"><?php echo $a['program_name']?></option>
        <?php
        $select_program=mysqli_query($conn,"SELECT * FROM programs");
        while($row=mysqli_fetch_array($select_program)){
            ?>
            
            <option value="<?php echo $row['program_id']?>"><?php echo $row['program_name']?></option>
            
            <?php
        }
        
        ?>
       </select>
        <br>
        <span>Class Code<sup>*</sup></span><br>
        <input type="text" name="code" value="<?php echo $a['class_code']?>"><br>
        <br>
        <button name="update">Update</button>
</div>
</div>
    </form>
    
    <?php
}
if (isset($_POST['update'])){
$name=$_POST['name'];
$code=$_POST['code'];
$prog = $_POST['program'];
$update=mysqli_query($conn,"UPDATE class set level='$name',class_code='$code',class_program='$prog' where cid='$class'");
    header("location:class.php");

    }
?>
<style>
    .cont{
        width: 30%;
        font-size: 14px;
        box-shadow: 0px 0px 3px 3px rgb(170, 204, 170);
        margin: auto;
        border-radius: 5px;
        text-align: center;
        padding: 10px;
    }
    button{
        font-size: 20px;
        background-color: green;
        cursor: pointer;
        border: none;
        border-radius: 3px;
        margin: 5px;
        padding: auto;
        font-weight: bold;
        color: white;
    }
    
</style>


