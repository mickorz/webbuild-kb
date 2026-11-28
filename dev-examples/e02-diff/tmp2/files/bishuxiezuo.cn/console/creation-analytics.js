(function () {
  function send(name, action, reason) {
    try {
      if (!window.LF_API || typeof window.LF_API.trackCreationEvent !== "function") return;
      window.LF_API.trackCreationEvent(name, action, reason);
    } catch (error) {}
  }

  window.LF_CREATION_ANALYTICS = {
    intent: function (action) {
      send("creation_intent", action);
    },
    blocked: function (action, reason) {
      send("creation_gate_blocked", action, reason);
    },
    submitted: function (action) {
      send("creation_task_submitted", action || "submit_prose");
    },
    noteProseBlocked: function (reason) {
      send("creation_gate_blocked", "run_prose", reason);
    }
  };
})();
