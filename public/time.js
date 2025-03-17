const timeElement = document.querySelector(".time");
const dateElement = document.querySelector(".date");

/*
  @param {Date} date
 */
function formatTime(date) {
  const hours12 = date.getHours() % 12 || 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const isAm = date.getHours() < 12;

  return `${hours12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")} ${isAm ? "A.M." : "P.M."}`;
}

/**
 * @param {Date} date
 */
function formatDate(date) {
  const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  return `${DAYS[date.getDay()]}, ${
    MONTHS[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()}`;
}

setInterval(() => {
  const now = new Date();

  timeElement.textContent = formatTime(now);
  dateElement.textContent = formatDate(now);
}, 200);



/*
function sendMessage() {
  let input = document.getElementById("messageInput");
  let message = input.value.trim();
  if (message !== "") {
      let chatBox = document.getElementById("chatBox");
      let msgDiv = document.createElement("div");
      msgDiv.textContent = message;
      msgDiv.style.padding = "10px";
      msgDiv.style.margin = "5px 0";
      msgDiv.style.background = "#d1e7fd";
      msgDiv.style.borderRadius = "5px";
      chatBox.appendChild(msgDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
      input.value = "";
  }
}*/