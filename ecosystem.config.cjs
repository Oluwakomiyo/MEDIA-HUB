module.exports = {
  apps: [
    {
      name: "frontend",
      cwd: "frontend",
      script: "node",
      args: "./node_modules/next/dist/bin/next start",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};