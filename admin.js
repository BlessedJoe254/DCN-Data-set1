document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("memberForm");
  const tableBody = document.querySelector("#membersTable tbody");

  // ✅ Fetch all members
  async function loadMembers() {
    try {
      const res = await fetch("/members");
      const data = await res.json();
      tableBody.innerHTML = "";

      data.forEach((member) => {
        const row = `
          <tr>
            <td>${member.id}</td>
            <td>${member.fullname}</td>
            <td>${member.gender}</td>
            <td>${member.phone}</td>
            <td>${member.department}</td>
            <td>${member.residence}</td>
            <td>${new Date(member.created_at).toLocaleString()}</td>
          </tr>
        `;
        tableBody.insertAdjacentHTML("beforeend", row);
      });
    } catch (err) {
      console.error("Error loading members:", err);
    }
  }

  loadMembers();

  // ✅ Add new member
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const member = {
      fullname: document.getElementById("fullname").value,
      gender: document.getElementById("gender").value,
      phone: document.getElementById("phone").value,
      department: document.getElementById("department").value,
      residence: document.getElementById("residence").value,
    };

    try {
      const res = await fetch("/add-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(member),
      });

      const data = await res.json();
      alert(data.message);

      if (data.success) {
        form.reset();
        loadMembers();
      }
    } catch (err) {
      console.error("Error adding member:", err);
      alert("Server error — please try again.");
    }
  });
});
