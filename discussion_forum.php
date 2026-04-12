<?php
session_start();
include("connection.php");

if (!isset($_SESSION['tcode'])) {
    header("location:sign.php");
    exit();
}

$tcode = $_SESSION['tcode'];
$teacher_query = mysqli_query($conn, "SELECT * FROM teacher WHERE tcode='$tcode'");
$teacher = mysqli_fetch_assoc($teacher_query);
$tid = $teacher['tid'];

// Get classes
$classes_query = mysqli_query($conn, "SELECT * FROM class WHERE tid='$tid'");

// Handle forum creation
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['create_forum'])) {
    $cid = $_POST['cid'];
    $title = mysqli_real_escape_string($conn, $_POST['title']);
    $description = mysqli_real_escape_string($conn, $_POST['description']);
    
    $insert = mysqli_query($conn, "
        INSERT INTO discussion_forums (cid, title, description, created_by) 
        VALUES ('$cid', '$title', '$description', '$tid')
    ");
    
    if ($insert) {
        $success = "Forum created successfully!";
    } else {
        $error = "Failed to create forum: " . mysqli_error($conn);
    }
}

// Get all forums
$forums_query = mysqli_query($conn, "
    SELECT f.*, c.class_name,
           (SELECT COUNT(*) FROM forum_topics WHERE forum_id = f.forum_id) as topic_count
    FROM discussion_forums f
    JOIN class c ON f.cid = c.cid
    WHERE f.created_by='$tid'
    ORDER BY f.created_at DESC
");
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discussion Forum</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .btn-green {
            background-color: rgb(8, 58, 8);
            color: white;
        }
        .btn-green:hover {
            background-color: rgb(5, 40, 5);
            color: white;
        }
        .forum-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.3s;
        }
        .forum-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .form-container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container-fluid">
        <h2 class="mb-4" style="color: rgb(8, 58, 8);">
            <i class="fas fa-comments"></i> Discussion Forums
        </h2>
        
        <!-- Create Forum Form -->
        <div class="form-container">
            <h5>Create New Discussion Forum</h5>
            
            <?php if(isset($success)): ?>
                <div class="alert alert-success"><?php echo $success; ?></div>
            <?php endif; ?>
            
            <?php if(isset($error)): ?>
                <div class="alert alert-danger"><?php echo $error; ?></div>
            <?php endif; ?>
            
            <form method="POST">
                <div class="mb-3">
                    <label>Select Class *</label>
                    <select name="cid" class="form-control" required>
                        <option value="">Select Class</option>
                        <?php while($class = mysqli_fetch_assoc($classes_query)): ?>
                            <option value="<?php echo $class['cid']; ?>">
                                <?php echo htmlspecialchars($class['class_name']); ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                
                <div class="mb-3">
                    <label>Forum Title *</label>
                    <input type="text" name="title" class="form-control" required>
                </div>
                
                <div class="mb-3">
                    <label>Description</label>
                    <textarea name="description" class="form-control" rows="3"></textarea>
                </div>
                
                <button type="submit" name="create_forum" class="btn btn-green">
                    <i class="fas fa-plus-circle"></i> Create Forum
                </button>
            </form>
        </div>
        
        <!-- Forums List -->
        <h5 class="mb-3">Active Forums</h5>
        
        <?php while($forum = mysqli_fetch_assoc($forums_query)): ?>
            <div class="forum-card">
                <div class="row align-items-center">
                    <div class="col-md-7">
                        <h5>
                            <a href="view_forum.php?fid=<?php echo $forum['forum_id']; ?>" style="color: rgb(8, 58, 8); text-decoration: none;">
                                <?php echo htmlspecialchars($forum['title']); ?>
                            </a>
                        </h5>
                        <p class="text-muted mb-1">
                            <i class="fas fa-chalkboard"></i> <?php echo $forum['class_name']; ?>
                            <br>
                            <?php echo htmlspecialchars($forum['description']); ?>
                        </p>
                    </div>
                    <div class="col-md-3">
                        <small class="text-muted">
                            <i class="fas fa-comments"></i> Topics: <?php echo $forum['topic_count']; ?>
                            <br>
                            <i class="far fa-clock"></i> Created: <?php echo date('M d, Y', strtotime($forum['created_at'])); ?>
                        </small>
                    </div>
                    <div class="col-md-2 text-end">
                        <a href="view_forum.php?fid=<?php echo $forum['forum_id']; ?>" class="btn btn-sm btn-green">
                            <i class="fas fa-eye"></i> View Forum
                        </a>
                    </div>
                </div>
            </div>
        <?php endwhile; ?>
        
        <?php if(mysqli_num_rows($forums_query) == 0): ?>
            <div class="text-center p-5">
                <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                <p>No discussion forums created yet.</p>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>