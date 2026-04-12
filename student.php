<?php
 include("connection.php");
session_start();
$l = $_SESSION['cl'];
$select_year=mysqli_query($conn,"SELECT * FROM year where status='active'");
$a_year=mysqli_fetch_array($select_year);
$year=$a_year['year_id'];

$select_class=mysqli_query($conn,"SELECT * FROM class where cid='$l'");
$a_class=mysqli_fetch_array($select_class);
$class_program=$a_class['class_program'];

?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Student Management</title>
    <style>
    * {
        padding: 0;
        margin: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-sizing: border-box;
    }

    body {
        background-color: #f5f5f5;
        overflow-x: hidden;
        font-size: 12px;
    }

    .container {
        display: flex;
        min-height: 100vh;
        gap: 10px;
        padding: 10px;
    }

    .student-list {
        flex: 8;
        /* 80% width */
        background-color: white;
        border-radius: 5px;
        padding: 10px;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
        overflow-x: auto;
    }

    .add-student {
        flex: 2;
        /* 20% width */
        background-color: white;
        border-radius: 5px;
        padding: 10px;
        box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 10px;
        height: fit-content;
    }

    h1 {
        color: #2c3e50;
        margin-bottom: 10px;
        font-size: 14px;
        border-bottom: 1px solid #3498db;
        padding-bottom: 5px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        font-size: 12px;
    }

    th,
    td {
        padding: 5px 8px;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }

    th {
        background-color: #3498db;
        color: white;
        font-weight: 600;
        font-size: 12px;
    }

    tr:hover {
        background-color: #f5f5f5;
    }

    select {
        width: 100%;
        padding: 4px;
        border: 1px solid #ddd;
        border-radius: 3px;
        background-color: white;
        font-size: 12px;
    }

    .form-group {
        margin-bottom: 8px;
    }

    .form-group label {
        display: block;
        margin-bottom: 3px;
        font-weight: 600;
        color: #2c3e50;
        font-size: 12px;
    }

    .form-group input {
        width: 100%;
        padding: 6px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 12px;
    }

    .form-group input:focus {
        border-color: #3498db;
        outline: none;
    }

    .btn {
        display: block;
        padding: 4px 6px;
        background-color: #3498db;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        text-decoration: none;
        transition: background-color 0.3s;
        text-align: center;
        margin-bottom: 3px;
        width: 60px;
    }

    .btn:hover {
        background-color: #2980b9;
    }

    .btn-delete {
        background-color: #e74c3c;
    }

    .btn-delete:hover {
        background-color: #c0392b;
    }

    .btn-import {
        background-color: #2ecc71;
        margin-top: 8px;
        text-align: center;
        display: block;
        width: 100%;
        padding: 6px;
        font-size: 12px;
    }

    .btn-import:hover {
        background-color: #27ae60;
    }

    .action-buttons {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    @media (max-width: 992px) {
        .container {
            flex-direction: column;
        }

        .add-student {
            position: static;
        }
    }
    </style>
</head>

<body>
    <div class="container">
        <!-- Student List Section (Left - 80%) -->
        <div class="student-list">
            <h1>Student List</h1>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>First Name</th>
                        <th>Last Name</th>

                        <th>District</th>
                        <th>Sector</th>
                        <th>Status</th>
                        <th>Decision</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                   
                    $select = mysqli_query($conn, "SELECT * from class,student,student_promotion_log where class.cid=student.class and student_promotion_log.sid=student.sid and
                    student_promotion_log.to_year='$year' and student_promotion_log.to_class='$l' and student_promotion_log.program_id='$class_program'");
                    while ($a = mysqli_fetch_array($select)) {
                        echo "<tr>
                            <td>".$a['sid']."</td>
                            <td>".$a['firstname']."</td>
                            <td>".$a['lastname']."</td>
                           
                            <td>".$a['district']."</td>
                            <td>".$a['secter']."</td>
                            <td>
                                <select class='status' data-sid='".$a['sid']."'>
                                    <option value='Active' ".($a['status'] == 'Active' ? 'selected' : '').">Active</option>
                                    <option value='Inactive' ".($a['status'] == 'Inactive' ? 'selected' : '').">Inactive</option>
                                </select>
                            </td>
                            <td>
                                <select class='decision' data-sid='".$a['sid']."'>
                                    <option value=''>Select</option>
                                    <option value='Promoted' ".($a['decission'] == 'Promoted' ? 'selected' : '').">Promoted</option>
                                    <option value='Repeated' ".($a['decission'] == 'Repeated' ? 'selected' : '').">Repeated</option>
                                    <option value='Graduated' ".($a['decission'] == 'Graduated' ? 'selected' : '').">Graduated</option>
                                </select>
                            </td>
                            <td class='action-buttons'>
                                <a href='supdate.php?id=".$a['sid']."' class='btn'>Edit</a>
                                <a href='sdelete.php?id=".$a['sid']."' class='btn btn-delete'>Delete</a>
                            </td>
                        </tr>";
                    } 
                    ?>
                </tbody>
            </table>
        </div>

        <!-- Add Student Form (Right - 20%) -->
        <div class="add-student">
            <h1>Add New Student</h1>
            <form action="" method="POST">
                <div class="form-group">
                    <label for="fname">First Name <sup>*</sup></label>
                    <input type="text" id="fname" name="fname" required>
                </div>
                <div class="form-group">
                    <label for="lname">Last Name <sup>*</sup></label>
                    <input type="text" id="lname" name="lname" required>
                </div>
                <div class="form-group">
                    <label for="reg">Reg Number <sup>*</sup></label>
                    <input type="number" id="reg" name="reg" >
                </div>
                <div class="form-group">
                    <label for="district">District <sup>*</sup></label>
                    <input type="text" id="district" name="district" required>
                </div>
                <div class="form-group">
                    <label for="secter">Sector <sup>*</sup></label>
                    <input type="text" id="secter" name="secter" required>
                </div>
                <button type="submit" name="create" class="btn" style="width:100%">Register</button>
                <a href="index_Excel.php" class="btn-import">Import Excel</a>
            </form>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
    $(document).ready(function() {
        // Update status when changed
        $('.status').change(function() {
            var sid = $(this).data('sid');
            var status = $(this).val();

            $.ajax({
                url: 'update_status.php',
                type: 'POST',
                data: {
                    sid: sid,
                    status: status
                },
                success: function(response) {
                    alert('Status updated');
                },
                error: function() {
                    alert('Error updating status');
                }
            });
        });

        // Update decision when changed
        $('.decision').change(function() {
            var sid = $(this).data('sid');
            var decision = $(this).val();

            $.ajax({
                url: 'update_decision.php',
                type: 'POST',
                data: {
                    sid: sid,
                    decision: decision
                },
                success: function(response) {
                    alert('Decision updated');
                },
                error: function() {
                    alert('Error updating decision');
                }
            });
        });
    });
    </script>
</body>

</html>

<?php
if (isset($_POST['create'])) {
    $fname = $_POST['fname'];
    $lname = $_POST['lname'];
    $secter = $_POST['secter'];
    $reg = $_POST['reg'];
    $district = $_POST['district'];
    
    $check = mysqli_query($conn, "SELECT * FROM student where reg='$reg' ");
    if (mysqli_num_rows($check) > 0) {
        echo "<script>alert('Reg number {$reg} exists'),location='student.php'</script>";  
    } else {
        // Set default values for missing fields
        $status = 'Active';
        $decision = '';
        $trade = '0'; // Assuming trade is a required field in your table
        
        $insert = mysqli_query($conn, "INSERT INTO student(firstname,program_id, lastname, district, secter, trade, class, reg, status, decission,registed_year) 
                                     VALUES('$fname','$class_program', '$lname', '$district', '$secter', '$trade', '$l', '$reg', '$status', '$decision','$year')");
        
        if ($insert){
            $select_new_student=mysqli_query($conn,"SELECT * FROM student");
            while ($a_student=mysqli_fetch_array($select_new_student)) {
                $new_student=$a_student['sid'];
                $chech_from_promotion=mysqli_query($conn,"SELECT * FROM student_promotion_log where sid='$new_student'");
                if (mysqli_num_rows($chech_from_promotion)<1) {
                    mysqli_query($conn,"INSERT INTO student_promotion_log(sid,from_year,to_year,from_class,to_class,decision,program_id) values('$new_student',
                    '$year','$year','$l','$l','new','$class_program')");
                }
            }
            echo "<script>alert('{$fname} {$lname} added'),location='student.php'</script>";
        } else {
            // Add error reporting to help debug
            echo "<script>alert('Error adding student: " . mysqli_error($conn) . "'),location='student.php'</script>";
        }
    }
}   
?>