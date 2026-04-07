
try {
    console.log('Testing requires...');
    require('./src/utils/logger');
    console.log('Logger ok');
    require('./src/models');
    console.log('Models ok');
    require('./src/utils/database');
    console.log('Database ok');
    require('./src/server/app');
    console.log('App ok');
    require('./src/bot/client');
    console.log('Client ok');
    console.log('ALL REQUIRES SUCCESSFUL');
    process.exit(0);
} catch (e) {
    console.error('REQUIRE FAILED:', e);
    process.exit(1);
}
