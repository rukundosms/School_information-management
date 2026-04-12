<?php
session_start();
include("connection.php");

if (!isset($_SESSION['sid'])) {
    header("location:student_login.php");
    exit();
}

$sid = mysqli_real_escape_string($conn, $_SESSION['sid']);

// Get student information
$student_query = mysqli_query($conn, "
    SELECT s.*, c.class_name, c.class_code
    FROM student s
    INNER JOIN class c ON s.class = c.cid
    WHERE s.sid = '$sid'
");
$student = mysqli_fetch_assoc($student_query);

// Get promotion history
$promotion_history = mysqli_query($conn, "
    SELECT * FROM student_promotion_log 
    WHERE sid = '$sid' 
    ORDER BY created_at DESC
");

include("student_sidebar.php");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Profile - Student Portal</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .profile-card {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .profile-img {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: rgb(8, 58, 8);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
        }
        .profile-img i {
            font-size: 5rem;
            color: white;
        }
        .info-label {
            font-weight: bold;
            color: rgb(8, 58, 8);
            width: 150px;
            display: inline-block;
        }
        .info-value {
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <div class="row">
            <!-- Sidebar already included -->
            
            <!-- Main Content -->
            <div class="col-md-10 main-content">
                <h2 class="mb-4" style="color: rgb(8, 58, 8);">
                    <i class="fas fa-user"></i> My Profile
                </h2>
                
                <div class="row">
                    <div class="col-md-4">
                        <div class="profile-card text-center">
                            <div class="profile-img">
                                <i class="fas fa-user-graduate"></i>
                            </div>
                            <h4><?php echo htmlspecialchars($student['firstname'] . ' ' . $student['lastname']); ?></h4>
                            <p class="text-muted"><?php echo htmlspecialchars($student['reg']); ?></p>
                            <span class="badge bg-success">Active Student</span>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="profile-card">
                            <h5><i class="fas fa-info-circle"></i> Personal Information</h5>
                            <hr>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <span class="info-label">Full Name:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['firstname'] . ' ' . $student['lastname']); ?></span>
                                </div>
                                <div class="col-md-6">
                                    <span class="info-label">Registration Number:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['reg']); ?></span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <span class="info-label">District:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['district'] ?? 'N/A'); ?></span>
                                </div>
                                <div class="col-md-6">
                                    <span class="info-label">Sector:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['secter'] ?? 'N/A'); ?></span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <span class="info-label">Trade:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['trade'] ?? 'N/A'); ?></span>
                                </div>
                                <div class="col-md-6">
                                    <span class="info-label">Program ID:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['program_id'] ?? 'N/A'); ?></span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <span class="info-label">Current Class:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['class_name']); ?> (<?php echo htmlspecialchars($student['class_code']); ?>)</span>
                                </div>
                                <div class="col-md-6">
                                    <span class="info-label">Registration Year:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['registed_year']); ?></span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <span class="info-label">Status:</span>
                                    <span class="info-value">
                                        <?php if($student['status'] == 'active'): ?>
                                            <span class="badge bg-success">Active</span>
                                        <?php else: ?>
                                            <span class="badge bg-danger">Inactive</span>
                                        <?php endif; ?>
                                    </span>
                                </div>
                                <div class="col-md-6">
                                    <span class="info-label">Decision:</span>
                                    <span class="info-value"><?php echo htmlspecialchars($student['decission'] ?? 'Pending'); ?></span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Promotion History -->
                        <div class="profile-card">
                            <h5><i class="fas fa-history"></i> Promotion History</h5>
                            <hr>
                            <?php if(mysqli_num_rows($promotion_history) > 0): ?>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>From Year</th>
                                                <th>To Year</th>
                                                <th>From Class</th>
                                                <th>To Class</th>
                                                <th>Decision</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php while($promo = mysqli_fetch_assoc($promotion_history)): ?>
                                                <tr>
                                                    <td><?php echo $promo['from_year']; ?></td>
                                                    <td><?php echo $promo['to_year']; ?></td>
                                                    <td><?php echo $promo['from_class']; ?></td>
                                                    <td><?php echo $promo['to_class']; ?></td>
                                                    <td>
                                                        <span class="badge bg-<?php echo $promo['decision'] == 'promoted' ? 'success' : 'warning'; ?>">
                                                            <?php echo ucfirst($promo['decision']); ?>
                                                        </span>
                                                    </td>
                                                    <td><?php echo date('M d, Y', strtotime($promo['created_at'])); ?></td>
                                                </tr>
                                            <?php endwhile; ?>
                                        </tbody>
                                    </table>
                                </div>
                            <?php else: ?>
                                <p class="text-muted text-center">No promotion history available.</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>