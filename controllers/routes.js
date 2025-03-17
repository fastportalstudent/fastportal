const { Server } = require("socket.io");
function add(app, server) {
    const accountModel = require("../models/accountModel");

    const messageModel = require("../models/messageModel");


    const io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId
        console.log(`User connected: socket ID = ${socket.id}, userId = ${userId}`);

        if (!userId) {
            socket.disconnect();
            return;
        }

        socket.join(userId);

        // Load previous messages for the user
        socket.on("loadMessages", async (data) => {
            const messages = await messageModel.find({
                $or: [
                    { sender: data.userId, receiver: data.selectedTeacher },
                    { sender: data.selectedTeacher, receiver: data.userId }
                ]
            })
                .populate("sender", "fullname")
                .populate("receiver", "fullname")
                .sort({ createdAt: 1 });

            socket.emit("messagesLoaded", messages);
        });

        // Handle sending a message
        socket.on("sendMessage", async (data) => {
            const receiver = await accountModel.findOne({ _id: data.receiver });
            if (!receiver) {
                socket.emit("errorMessage", "User not found.");
                return;
            }

            const sender = await accountModel.findOne({ _id: data.sender });
            if (!sender.isTeach && !receiver.isTeach) {
                socket.emit("errorMessage", "Students can only message teachers.");
                return;
            }

            const newMessage = new messageModel({
                sender: data.sender,
                receiver: data.receiver,
                text: data.text,
            });

            await newMessage.save();
            io.to(socket.id).emit("receiveMessage", newMessage); // Notify sender
            io.to(data.receiver).emit("receiveMessage", newMessage);


        });

        socket.on("disconnect", () => {
            console.log(`User disconnected: socket ID = ${socket.id}, userId = ${userId}`);
        });
    });








    app.get("/", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.redirect("/home");
        }
    });
    /* app.get("/login", function (req, resp) {
        resp.render("login", {
            layout: "index",
            title: "Login",
            error: req.query.account == "failed",
        });
    });*/

    app.get("/login", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.render("login", {
                layout: "index",
                title: "Login",
                error: req.query.account == "failed",
            });
        } else {
            resp.redirect("/home");
        }
    });

    app.post("/login-validation", function (req, resp) {
        accountModel
            .findOne({ name: req.body.email, pass: req.body.password })
            .lean()
            .then(function (account) {
                if (account != undefined && account._id != null) {
                    req.session.account_id = account._id.toString();
                    req.session.account_name = account.name;
                    req.session.account_fullname = account.fullname;
                    req.session.account_strand = account.strand;
                    req.session.account_section = account.section;
                    req.session.account_lrn = account.lrn;
                    req.session.account_profile = account.profile;
                    req.session.account_isTeach = account.isTeach;
                    console.log("Profile Picture Stored:", account.profile);
                    if (req.body.remember) {
                        req.session.cookie.maxAge = 21 * 24 * 60 * 60 * 1000;
                    } else {
                        req.session.cookie.expires = false;
                    }
                    resp.redirect("/home");
                    return;
                } else {
                    resp.redirect("/login?account=failed");
                    return;
                }
            });
    });

    app.get("/logout", function (req, resp) {
        req.session.destroy(function (err) {
            resp.redirect("/login");
            return;
        });
    });


    app.get("/home", function (req, resp) {

        const user = {
            fullname: req.session.account_fullname,
            section: req.session.account_section,
            lrn: req.session.account_lrn,
            strand: req.session.account_strand,
            profile: req.session.account_profile,
            isTeach: req.session.account_isTeach,
        }

        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("home", {
                layout: "index",
                title: "Home",
                home: true,
                user: user,

            });
        }
    });

    const PDFDocument = require("pdfkit");
    const fs = require("fs");
    const path = require("path");

    /*    if (!req.session.account_id) return res.redirect("/login");

        const user = await accountModel.findById(req.session.account_id);

        if (!user.gradesPdf) return res.status(404).send("No grades available.");

        const filePath = path.join(__dirname, "../uploads", user.gradesPdf);
        res.download(filePath);
    });*/

    app.get("/generate-grades", async (req, res) => {
        if (!req.session.account_id) {
            return res.redirect("/login");
        }

        // Retrieve user details from session
        const user = await accountModel.findById(req.session.account_id);

        if (user.gradesPdf) {
            const filePath = path.join(__dirname, "../pdfs", user.gradesPdf);
            return res.download(filePath, user.gradesPdf);
        }

        const pdfFileName = `grades_${user._id}.pdf`;
        const filePath = path.join(__dirname, "../pdfs", pdfFileName);

        if (!fs.existsSync(path.join(__dirname, "../pdfs"))) {
            fs.mkdirSync(path.join(__dirname, "../pdfs"));
        }


        // Subjects and random grades (3 quarters)
        const subjects = ["Math", "Science", "English", "History", "PE"];
        let grades = subjects.map(subject => ({
            subject,
            q1: (89 + Math.random() * (97 - 89)).toFixed(3), // Quarter 1
            q2: (90 + Math.random() * (100 - 90)).toFixed(3),// Quarter 2
            q3: (89 + Math.random() * (97 - 89)).toFixed(3)// Quarter 3
        }));

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Title
        doc.fontSize(18).text("Student Grades Report", { align: "center" });
        doc.moveDown(2);

        // Student Profile (Top Left)
        doc.fontSize(12).text(`Name: ${user.fullname}`, { align: "left" });
        doc.text(`Section: ${user.section}`);
        doc.text(`LRN: ${user.lrn}`);
        doc.text(`Strand: ${user.strand}`);
        doc.moveDown(2);

        // Table Headers & Data
        const table = {
            headers: ["Subject", "Quarter 1", "Quarter 2", "Quarter 3"],
            rows: grades.map(g => [g.subject, g.q1, g.q2, g.q3])
        };

        // Draw table
        doc.fontSize(12);
        const startY = doc.y + 10;
        let rowY = startY;

        // Draw headers
        doc.font("Helvetica-Bold");
        doc.text(table.headers[0], 50, rowY, { width: 150, align: "left" });
        doc.text(table.headers[1], 200, rowY, { width: 100, align: "center" });
        doc.text(table.headers[2], 300, rowY, { width: 100, align: "center" });
        doc.text(table.headers[3], 400, rowY, { width: 100, align: "center" });

        rowY += 20; // Move down for rows

        // Draw rows
        doc.font("Helvetica");
        table.rows.forEach(row => {
            doc.text(row[0], 50, rowY, { width: 150, align: "left" });
            doc.text(row[1].toString(), 200, rowY, { width: 100, align: "center" });
            doc.text(row[2].toString(), 300, rowY, { width: 100, align: "center" });
            doc.text(row[3].toString(), 400, rowY, { width: 100, align: "center" });
            rowY += 20;
        });

        doc.end();

        writeStream.on("finish", async () => {
            // Save the generated PDF filename in the user's account
            user.gradesPdf = pdfFileName;
            await user.save();

            res.download(filePath, pdfFileName);
        });
    });

    const multer = require("multer");

    // Set up storage for uploaded files
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const dir = path.join(__dirname, "../uploads");
            if (!fs.existsSync(dir)) fs.mkdirSync(dir);
            cb(null, dir);
        },
        filename: function (req, file, cb) {
            cb(null, req.session.account_id + path.extname(file.originalname));
        },
    });

    const upload = multer({ storage: storage });

    // Handle file upload
    app.post("/upload-grades", upload.single("gradesFile"), async (req, res) => {
        if (!req.session.account_id) return res.redirect("/login");

        const user = await accountModel.findById(req.session.account_id);
        if (!user.isTeach) return res.status(403).send("Unauthorized");

        user.gradesPdf = req.file.filename;
        await user.save();

        res.redirect("/home");
    });











    app.get("/announcements", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("announcements", {
                layout: "index",
                title: "Announcements",
                announcements: true,
            });
        }
    });
    app.get("/schedules/grade7", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("grade7", {
                layout: "index",
                title: "Grade 7 Schedules",
                schedules: true,
                grade7: true,
            });
        }
    });
    app.get("/schedules/grade8", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("grade8", {
                layout: "index",
                title: "Grade 8 Schedules",
                schedules: true,
                grade8: true,
            });
        }
    });
    app.get("/schedules/grade9", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("grade9", {
                layout: "index",
                title: "Grade 9 Schedules",
                schedules: true,
                grade9: true,
            });
        }
    });
    app.get("/schedules/grade10", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("grade10", {
                layout: "index",
                title: "Grade 10 Schedules",
                schedules: true,
                grade10: true,
            });
        }
    });
    app.get("/schedules/grade11", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("grade11", {
                layout: "index",
                title: "Grade 11 Schedules",
                schedules: true,
                grade11: true,
            });
        }
    });
    app.get("/schedules/grade12", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("grade12", {
                layout: "index",
                title: "Grade 12 Schedules",
                schedules: true,
                grade12: true,
            });
        }
    });
    app.get("/news", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("news", {
                layout: "index",
                title: "News",
                news: true,
            });
        }
    });
    app.get("/messages", async (req, resp) => {
        if (!req.session.account_id) {
            return resp.redirect("/login");
        }

        try {
            const user = await accountModel.findById(req.session.account_id).lean();

            let teachers;
            if (user.isTeach) {
                // If user is a teacher, fetch students
                teachers = await accountModel.find({ _id: { $ne: user._id } }).lean();
            } else {
                // If user is a student, fetch teachers
                teachers = await accountModel.find({ isTeach: true }).lean();
            }

            resp.render("messages", {
                layout: "index",
                title: "Messages",
                userId: req.session.account_id,
                teachers: teachers, // Send the correct list (students or teachers)
                isTeacher: user.isTeach
            });
        } catch (error) {
            console.error("Error fetching contacts:", error);
            resp.status(500).send("Error loading contacts");
        }
    });

    app.get("/school/jhscurriculum", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("jhscurriculum", {
                layout: "index",
                title: "Junior High School Curriculum",
                school: true,
                jhscurriculum: true,
            });
        }
    });
    app.get("/school/shscurriculum", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("shscurriculum", {
                layout: "index",
                title: "School",
                school: true,
                shscurriculum: true,
            });
        }
    });
    app.get("/school/academicpolicies", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("academicpolicies", {
                layout: "index",
                title: "School Policies",
                school: true,
                academicpolicies: true,
            });
        }
    });
    app.get("/school/aboutfast", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("aboutfast", {
                layout: "index",
                title: "About Fast",
                school: true,
                aboutfast: true,
            });
        }
    });
    app.get("/school/organizations", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("organizations", {
                layout: "index",
                title: "Organizations",
                school: true,
                organizations: true,
            });
        }
    });
    app.get("/school/fasthymn", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("hymn", {
                layout: "index",
                title: "Hymn",
                school: true,
                hymn: true,
            });
        }
    });
    app.get("/school/board", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("board", {
                layout: "index",
                title: "Board of Trustees",
                school: true,
                board: true,
            });
        }
    });
    app.get("/contacts", function (req, resp) {
        if (req.session.account_id == undefined) {
            resp.redirect("/login");
            return;
        } else {
            resp.render("contacts", {
                layout: "index",
                title: "Contacts",
                contacts: true,
            });
        }
    });
    app.get("/tos", function (req, resp) {
            resp.render("tos", {
                layout: "index",
                title: "Terms of Services and Privacy Policy",
                tos: true,
            });
        }
    );
}

module.exports.add = add;