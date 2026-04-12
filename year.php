<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Academic Years</title>
    <style>
        *{
            padding: 0;
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            box-sizing: border-box;
        }
        body {
            background-color: #f5f5f5;
            min-height: 100vh;
        }
        .cont{
            width: 100%;
            min-height: 100vh;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        /* Old Section - Table */
        .old{
            width: 100%;
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow-x: auto;
        }
        .old h1{
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.5rem;
            text-align: center;
        }
        .old table{
            width: 100%;
            min-width: 500px;
            border-collapse: collapse;
            font-size: 14px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 5px rgba(0,0,0,0.1);
        }
        .old th {
            background: #3498db;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
        }
        .old td {
            padding: 12px 8px;
            border-bottom: 1px solid #ecf0f1;
        }
        .old tr:hover {
            background-color: #f8f9fa;
        }
        
        /* Action Links */
        .action-links {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        a{
            padding: 6px 12px;
            text-decoration: none;
            font-size: 12px;
            text-transform: uppercase;
            background-color: #27ae60;
            color: white;
            font-weight: 600;
            border-radius: 4px;
            transition: all 0.3s ease;
            text-align: center;
            display: inline-block;
        }
        a:hover {
            transform: translateY(-2px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .delete{
            background-color: #e74c3c;
        }
        .delete:hover {
            background-color: #c0392b;
        }
        
        /* Add Section - Form */
        .add{
            width: 100%;
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .add h1{
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.5rem;
            text-align: center;
        }
        .info{
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            border-radius: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .info span{
            color: white;
            font-weight: 600;
            font-size: 14px;
            display: block;
            margin-bottom: 5px;
        }
        .info input{
            width: 100%;
            height: 45px;
            font-size: 14px;
            border-radius: 6px;
            border: 2px solid transparent;
            padding: 0 15px;
            background: rgba(255,255,255,0.9);
            transition: all 0.3s ease;
        }
        .info input:focus {
            outline: none;
            border-color: #3498db;
            background: white;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.3);
        }
        .add button{
            width: 100%;
            height: 45px;
            border-radius: 6px;
            border: none;
            background: #27ae60;
            color: white;
            font-weight: 600;
            font-size: 16px;
            margin-top: 15px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .add button:hover {
            background: #219a52;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
        }
        
        /* Responsive Design */
        @media (min-width: 768px) {
            .cont {
                flex-direction: row;
                align-items: flex-start;
            }
            .old {
                width: 70%;
            }
            .add {
                width: 30%;
                position: sticky;
                top: 20px;
            }
            .old h1, .add h1 {
                font-size: 1.75rem;
            }
        }
        
        @media (min-width: 1024px) {
            .cont {
                max-width: 1400px;
                margin: 0 auto;
                padding: 30px;
            }
            .old table {
                font-size: 15px;
            }
            a {
                font-size: 13px;
                padding: 8px 16px;
            }
        }
        
        @media (max-width: 480px) {
            .cont {
                padding: 10px;
            }
            .old, .add {
                padding: 15px;
            }
            .old h1, .add h1 {
                font-size: 1.25rem;
            }
            .info {
                padding: 15px;
            }
            .action-links {
                flex-direction: column;
                gap: 5px;
            }
            a {
                width: 100%;
                text-align: center;
            }
        }
        
        /* Loading and Success States */
        .add button:disabled {
            background: #95a5a6;
            cursor: not-allowed;
            transform: none;
        }
        
        /* Table Responsive Enhancements */
        @media (max-width: 767px) {
            .old {
                padding: 15px 10px;
            }
            .old table {
                min-width: 400px;
            }
            .old th, .old td {
                padding: 8px 6px;
                font-size: 13px;
            }
        }
        
        /* Success Message */
        .success-message {
            background: #d4edda;
            color: #155724;
            padding: 12px;
            border-radius: 6px;
            margin: 10px 0;
            text-align: center;
            border: 1px solid #c3e6cb;
        }
    </style>
</head>
<body>
    <form action="" method="POST">
        <div class="cont">
            <div class="old">
                <h1>Academic Years</h1>
                <table>
                    <tr>
                        <th>N<sup><u>o</u></sup></th>
                        <th>Year</th>
                        <th>Option</th>
                    </tr>
                    <?php
                    include("connection.php");
                    $select=mysqli_query($conn,"select * from year");
                    while ($a=mysqli_fetch_array($select)) {
                        echo"<tr>
                                <td>".$a['year_id']."</td>
                                <td>".$a['year']."</td>
                                <td>
                                    <div class='action-links'>
                                        <a href='yupdate.php?id=".$a['year_id']."'>Edit</a>
                                        <a href='ydelete.php?id=".$a['year_id']."' class='delete'>Delete</a>
                                    </div>
                                </td>
                            </tr>";
                    } 
                    ?>
                </table>
            </div>
            
            <div class="add">
                <h1>Add Year</h1>
                <div class="info">
                    <span>Academic Year<sup>*</sup></span>
                    <input type="text" name="year" placeholder="Enter academic year" required>
                    <button type="submit" name="create">Add Year</button>
                </div>
            </div>
        </div>
    </form>

    <script>
        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            const form = document.querySelector('form');
            const submitBtn = form.querySelector('button[name="create"]');
            
            form.addEventListener('submit', function() {
                // Add loading state
                submitBtn.disabled = true;
                submitBtn.textContent = 'Adding...';
                
                // Re-enable after 3 seconds in case of error
                setTimeout(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Add Year';
                }, 3000);
            });
            
            // Add focus effect to inputs
            const inputs = document.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('focus', function() {
                    this.parentElement.style.transform = 'scale(1.02)';
                });
                
                input.addEventListener('blur', function() {
                    this.parentElement.style.transform = 'scale(1)';
                });
            });
        });
    </script>
</body>
</html>

<?php
if (isset($_POST['create'])) {
    $name = $_POST['year'];
    
    // Basic validation
    if (!empty($name)) {
        $insert = mysqli_query($conn, "INSERT INTO year(year) VALUES('$name')");
        if ($insert) {
            echo "<script>
                    alert('New academic year Added');
                    window.location.href = 'year.php';
                  </script>";
        } else {
            echo "<script>alert('Error adding academic year')</script>";
        }
    } else {
        echo "<script>alert('Please enter an academic year')</script>";
    }
}
?>