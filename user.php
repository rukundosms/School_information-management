<?php
session_start();
include("connection.php");

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

// Update last activity
$tcode = $_SESSION['tcode'];
mysqli_query($conn, "UPDATE user SET last_activity = NOW() WHERE tcode= '$tcode'");

// Get teacher info
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");
$teacher = mysqli_fetch_assoc($teacher_query);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Teacher Dashboard - Online Classroom Management</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        * {
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body {
            background-color: #f5f5f5;
            color: #333;
        }

        .cont {
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .top {
            width: 100%;
            height: 60px;
            background-color: rgb(8, 58, 8);
            display: flex;
            color: #fff;
            align-items: center;
            padding: 0 20px;
            position: fixed;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .s {
            flex: 1;
            text-align: left;
            font-size: 18px;
            font-weight: bold;
        }

        .s i {
            margin-right: 10px;
        }

        .user {
            text-align: right;
            font-size: 14px;
        }

        .user i {
            margin-right: 5px;
        }

        .center {
            display: flex;
            margin-top: 60px;
            min-height: calc(100vh - 60px);
        }

        .left {
            width: 250px;
            background-color: rgb(8, 58, 8);
            position: fixed;
            height: calc(100vh - 60px);
            overflow-y: auto;
            transition: all 0.3s ease;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }

        .left::-webkit-scrollbar {
            width: 5px;
        }

        .left::-webkit-scrollbar-track {
            background: rgb(8, 58, 8);
        }

        .left::-webkit-scrollbar-thumb {
            background: #4caf50;
        }

        nav {
            display: flex;
            flex-direction: column;
            padding: 20px 0;
        }

        .logo-section {
            text-align: center;
            padding: 20px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            margin-bottom: 20px;
        }

        .logo-section img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin-bottom: 10px;
            border: 3px solid #4caf50;
        }

        .logo-section h3 {
            color: white;
            font-size: 16px;
            margin: 0;
        }

        .logo-section p {
            color: rgba(255,255,255,0.7);
            font-size: 12px;
            margin: 5px 0 0;
        }

        nav a {
            text-decoration: none;
            padding: 12px 20px;
            font-size: 14px;
            font-weight: 500;
            margin: 2px 10px;
            color: white;
            border-radius: 8px;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        nav a i {
            width: 20px;
            font-size: 16px;
            color: white;
        }

        nav a:hover {
            background: rgba(76, 175, 80, 0.3);
            transform: translateX(5px);
        }

        nav a.active {
            background: #4caf50;
            color: white;
        }

        nav a.active i {
            color: white;
        }

        .nav-section {
            margin: 10px 0;
        }

        .nav-section-title {
            padding: 10px 20px;
            color: rgba(255,255,255,0.6);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: bold;
        }

        iframe {
            width: calc(100% - 250px);
            margin-left: 250px;
            height: calc(100vh - 60px);
            background-color: #fff;
            border: none;
        }

        .menu-toggle {
            display: none;
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            margin-right: 15px;
        }

        @media (max-width: 768px) {
            .menu-toggle {
                display: block;
            }

            .left {
                transform: translateX(-100%);
                width: 280px;
                z-index: 1000;
            }

            .left.active {
                transform: translateX(0);
            }

            iframe {
                width: 100%;
                margin-left: 0;
            }

            .s {
                font-size: 14px;
            }

            .user {
                font-size: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="cont">
        <div class="top">
            <button class="menu-toggle" id="menuToggle">
                <i class="fas fa-bars"></i>
            </button>
            <div class="s">
                <i class="fas fa-chalkboard-teacher"></i>
                Class  Management System
            </div>
            <div class="user">
                <i class="fas fa-user-circle"></i>
                <?php echo htmlspecialchars($_SESSION['fname']." ".$_SESSION['lname']); ?>
            </div>
        </div>
        <div class="center">
            <div class="left" id="sidebar">
                <nav>
                    <div class="logo-section">
                        <img src="images/logo.jpg" alt="School Logo">
                        <h3><?php echo htmlspecialchars($_SESSION['fname']." ".$_SESSION['lname']); ?></h3>
                        <p>Teacher</p>
                    </div>
                    
                    <div class="nav-section">
                        <div class="nav-section-title">Main Menu</div>
                        <a href="teacher_dashboard_home.php" target="content">
                            <i class="fas fa-tachometer-alt"></i> Dashboard
                        </a>
                        <a href="my_classes.php" target="content">
                            <i class="fas fa-chalkboard"></i> My Classes
                        </a>
                    </div>

                    <div class="nav-section">
                        <div class="nav-section-title">Online Classes</div>
                        <a href="schedule_online_class.php" target="content">
                            <i class="fas fa-video"></i> Schedule Class
                        </a>
                        <a href="manage_online_classes.php" target="content">
                            <i class="fas fa-calendar-alt"></i> Manage Classes
                        </a>
                        <a href="join_class.php" target="content">
                            <i class="fas fa-door-open"></i> Join Class
                        </a>
                    </div>

                    <div class="nav-section">
                        <div class="nav-section-title">Assessments</div>
                        <a href="create_assessment.php" target="content">
                            <i class="fas fa-plus-circle"></i> Create Assessment
                        </a>
                        <a href="manage_assessments.php" target="content">
                            <i class="fas fa-tasks"></i> Manage Assessments
                        </a>
                        <a href="grade_submissions.php" target="content">
                            <i class="fas fa-graduation-cap"></i> Grade Submissions
                        </a>
                        <a href="assessment_reports.php" target="content">
                            <i class="fas fa-chart-line"></i> Assessment Reports
                        </a>
                        <a href="teacher_download_responses.php" target="content">
                        <i class="fas fa-download"></i> Download Responses </a>
                    </div>

                    <div class="nav-section">
                        <div class="nav-section-title">Marks & Results</div>
                        <a href="classes.php" target="content">
                            <i class="fas fa-upload"></i> Upload Marks
                        </a>
                        <a href="mymodule.php" target="content">
                            <i class="fas fa-edit"></i> Update Marks
                        </a>
                        <a href="view_results.php" target="content">
                            <i class="fas fa-chart-bar"></i> View Results
                        </a>
                    </div>

                    <div class="nav-section">
                        <div class="nav-section-title">Attendance</div>
                        <a href="mark_attendance.php" target="content">
                            <i class="fas fa-user-check"></i> Mark Attendance
                        </a>
                        <a href="attendance_report.php" target="content">
                            <i class="fas fa-file-alt"></i> Attendance Report
                        </a>
                    </div>

                    <div class="nav-section">
                        <div class="nav-section-title">Communication</div>
                        <a href="announcements.php" target="content">
                            <i class="fas fa-bullhorn"></i> Announcements
                        </a>
                        <a href="discussion_forum.php" target="content">
                            <i class="fas fa-comments"></i> Discussion Forum
                        </a>
                        <a href="send_message.php" target="content">
                            <i class="fas fa-envelope"></i> Send Message
                        </a>
                    </div>

                    <div class="nav-section">
                        <div class="nav-section-title">Resources</div>
                        <a href="upload_materials.php" target="content">
                            <i class="fas fa-cloud-upload-alt"></i> Upload Materials
                        </a>
                        <a href="e_portfolio.php" target="content">
                            <i class="fas fa-folder-open"></i> E-Portfolio
                        </a>
                    </div>

                    <div class="nav-section">
                        <div class="nav-section-title">Reports</div>
                        <a href="class_reports.php" target="content">
                            <i class="fas fa-chart-pie"></i> Class Reports
                        </a>
                        <a href="student_performance.php" target="content">
                            <i class="fas fa-chart-line"></i> Student Performance
                        </a>
                    </div>

                    <div class="nav-section">
                        <a href="singout.php">
                            <i class="fas fa-sign-out-alt"></i> Logout
                        </a>
                    </div>
                </nav>
            </div>
            <iframe src="teacher_dashboard_home.php" frameborder="0" name="content" title="Content Frame"></iframe>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const menuToggle = document.getElementById('menuToggle');
            const sidebar = document.getElementById('sidebar');

            menuToggle.addEventListener('click', function() {
                sidebar.classList.toggle('active');
            });

            // Set active link based on current page
            const currentPage = window.location.pathname.split('/').pop();
            const links = document.querySelectorAll('nav a');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href === currentPage) {
                    link.classList.add('active');
                }
            });

            // Close sidebar when clicking on a link (for mobile)
            const navLinks = document.querySelectorAll('nav a');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth < 768) {
                        sidebar.classList.remove('active');
                    }
                });
            });
        });
    </script>
</body>
</html>