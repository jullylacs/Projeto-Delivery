const Schedule = require("../models/Schedule");

exports.create = async (req, res) => {
  const schedule = await Schedule.create(req.body);
  res.json(schedule);
};

exports.getAll = async (req, res) => {
  const schedules = await Schedule.find()
    .populate("card")
    .populate("tecnico");

  res.json(schedules);
};

exports.update = async (req, res) => {
  const schedule = await Schedule.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

  res.json(schedule);
};