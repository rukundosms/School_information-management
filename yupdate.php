<?php
include("connection.php");
$row=$_GET['id'];
$select=mysqli_query($conn,"SELECT * FROM year where id='$row'");
while ($a=mysqli_fetch_array($select)) {
    ?>
    <form action="" method="post">
    <div class="cont">
    <h1>Trade update</h1>
        <div class="info">
        <span>Trade Name<sup>*</sup></span><br>
        <input type="text" name="name" value="<?php echo $a['year']?>"><br><br>
        <button name="update">Update</button>
</div>
</div>
    </form>
    
    <?php
}
if (isset($_POST['update'])) {
$name=$_POST['name'];
$update=mysqli_query($conn,"UPDATE year set year='$name' where id='$row'");
    header("location:year.php");
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


