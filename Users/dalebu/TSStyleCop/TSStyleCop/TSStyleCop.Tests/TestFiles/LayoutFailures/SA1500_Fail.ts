
// Expect failure on the opening brace
if (true)
{
    alert("Something");
}

// Expect failure on the closing brace
if (true) {
    alert("Something"); }

// Expect failure on the opening brace
if (true) { alert("Something");
    alert("Something else");
}

// Expect failure on else
if (true) {
}
else {
}

// Expect failure on catch
try {
}
catch (ex) {
}
