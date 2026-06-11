const fs = require('fs');
const file = 'app/home.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix pan responder
content = content.replace(
  'return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2 && Math.abs(gestureState.dx) > 15;',
  'return Math.abs(gestureState.dx) > 35 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 3;'
);

// 2. Add back button
content = content.replace(
  '<View style={{ flexDirection: \'row\', alignItems: \'center\', marginBottom: 24, gap: 10 }}>\n                 <Image source={require(\'../assets/images/icon.png\')} style={{ width: 32, height: 32, borderRadius: 16 }} />\n                 <Text style={{ color: \'rgba(255,255,255,0.92)\', fontSize: 18, fontWeight: \'bold\' }}>BeHappyTalk</Text>\n              </View>',
  '<View style={{ flexDirection: \'row\', alignItems: \'center\', justifyContent: \'space-between\', marginBottom: 24 }}>\n                <View style={{ flexDirection: \'row\', alignItems: \'center\', gap: 10 }}>\n                 <Image source={require(\'../assets/images/icon.png\')} style={{ width: 32, height: 32, borderRadius: 16 }} />\n                 <Text style={{ color: \'rgba(255,255,255,0.92)\', fontSize: 18, fontWeight: \'bold\' }}>BeHappyTalk</Text>\n                </View>\n                <TouchableOpacity onPress={toggleDrawer} style={{ padding: 8, backgroundColor: \'#333\', borderRadius: 20 }}>\n                  <MaterialIcons name="close" size={24} color="#FFFFFF" />\n                </TouchableOpacity>\n              </View>'
);

// 3. Replace Support Link
content = content.replace(
  'Linking.openURL(\'mailto:care@BeHappyTalk.com\');',
  'router.push(\'/support\');'
);

// 4. Move Legal Links to Settings
const settingsBlock =                 <TouchableOpacity style={styles.subMenuItem} onPress={handleLogout}>
                  <AntDesign name="logout" size={20} color="#EF4444" />
                  <Text style={[styles.subMenuText, { color: '#EF4444' }]}>{t('logout')}</Text>
                </TouchableOpacity>

                {/* Legal Pages nested in Settings */}
                <TouchableOpacity style={styles.subMenuItem} onPress={() => { toggleDrawer(); router.push('/terms'); }}>
                  <MaterialCommunityIcons name="file-document-outline" size={20} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.subMenuText}>{t('terms') || 'Terms & Conditions'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.subMenuItem} onPress={() => { toggleDrawer(); router.push('/privacy'); }}>
                  <MaterialCommunityIcons name="shield-account-outline" size={20} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.subMenuText}>{t('privacy') || 'Privacy Policy'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.subMenuItem} onPress={() => { toggleDrawer(); router.push('/safety'); }}>
                  <MaterialIcons name="security" size={20} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.subMenuText}>{t('safety') || 'Safety Policy'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.subMenuItem} onPress={() => { toggleDrawer(); router.push('/child-safety'); }}>
                  <MaterialIcons name="child-care" size={20} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.subMenuText}>Child Safety</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.subMenuItem} onPress={() => { toggleDrawer(); router.push('/report-vulnerability'); }}>
                  <MaterialIcons name="bug-report" size={20} color="rgba(255,255,255,0.45)" />
                  <Text style={styles.subMenuText}>Report Vulnerability</Text>
                </TouchableOpacity>;

content = content.replace(
  /<TouchableOpacity style=\{styles\.subMenuItem\} onPress=\{handleLogout\}>[\s\S]*?<\/TouchableOpacity>/m,
  settingsBlock
);

// Delete the old Legal Links Section
content = content.replace(
  /\{\/\* Legal Links \*\/\}.*?<View style=\{styles\.drawerFooter\}>/s,
  '<View style={styles.drawerFooter}>'
);

fs.writeFileSync(file, content);
console.log('Done replacing via node');
