import React, { FC, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Card, Text } from 'react-native-elements'
import { Picker } from '@react-native-picker/picker'
import { DEEPL_AUTH_KEY } from '@env'
import axios from 'axios'
import moment from 'moment'
import querystring from 'querystring'
import SpeechRecognition, { useSpeechRecognition, Command } from 'react-speech-recognition'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

const App: FC = () => {
  const commands: Command[] = [
    {
      command: '*',
      callback: async (command) => {
        if (command.length) {
          try {
            const translate = await axios.post<Translation>('https://api.deepl.com/v2/translate', querystring.stringify({
              auth_key: DEEPL_AUTH_KEY,
              text: command,
              target_lang: language.target.value,
            }))
            console.log(command, JSON.stringify(translate.data.translations))

            setTranslation([{
              time: moment().format('HH:mm:ss'),
              timestamp: moment().unix(),
              source: command,
              target: translate.data.translations[0].text
            }, ...translation])

            getApiUsage()

          } catch (error) {
            console.error(error)
          }
        }
      },
      matchInterim: false
    },
  ]

  const { interimTranscript } = useSpeechRecognition({ commands })
  const [apiUsage, setApiUsage] = useState<ApiUsage>({ character_count: 0, character_limit: 0 })
  const [languages, setLanguages] = useState<Languages[]>([])
  const [language, setLanguage] = useState<Language>({ source: { value: 'JA', index: 6 }, target: { value: 'EN-US', index: 2 } })
  const [translation, setTranslation] = useState<TranslationResult[]>([])

  const getApiUsage = async () => setApiUsage((await axios.get<ApiUsage>(`https://api.deepl.com/v2/usage?auth_key=${DEEPL_AUTH_KEY}`)).data)
  const startListening = () => SpeechRecognition.startListening({ language: language.source.value.toString(), continuous: true })

  useEffect(() => {
    (async () => setLanguages((await axios.post(`https://api.deepl.com/v2/languages`, querystring.stringify({
      auth_key: DEEPL_AUTH_KEY,
      type: 'target'
    }))).data))()
    getApiUsage()
    startListening()
    return () => SpeechRecognition.abortListening()
  }, [])

  useEffect(() => {
    SpeechRecognition.abortListening()
    const timeoutId = setTimeout(() => startListening(), 500)
    return () => clearTimeout(timeoutId)
  }, [language])

  const languageHandler = ({ source, target }: Partial<Language>) => source && setLanguage({ ...language, source }) || target && setLanguage({ ...language, target })

  return (
    <View style={styles.container}>
      <Text h1>DeepL Translator</Text>
      <View style={{ flexDirection: 'row', padding: 15 }}>
        <View style={{ alignItems: 'center' }}>
          <Text>Source Language:</Text>
          <Picker
            selectedValue={language.source.value}
            style={{ height: 20, width: 150 }}
            onValueChange={(value, index) => languageHandler({ source: { value, index } })}
          >
            {languages.map((data, index) => <Picker.Item key={index} label={data.name} value={data.language} />)}
          </Picker>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text>Target Language:</Text>
          <Picker
            selectedValue={language.target.value}
            style={{ height: 20, width: 150 }}
            onValueChange={(value, index) => languageHandler({ target: { value, index } })}
          >
            {languages.map((data, index) => <Picker.Item key={index} label={data.name} value={data.language} />)}
          </Picker>
        </View>
      </View>
      <Card containerStyle={{ width: '80%' }}>
        <Card.Title style={{ height: 20 }}>{interimTranscript || '…'}</Card.Title>
        <Card.FeaturedSubtitle style={{ textAlign: 'right', color: 'darkgrey' }}>
          {apiUsage?.character_count} / {apiUsage?.character_limit} ({(apiUsage?.character_count / apiUsage?.character_limit).toLocaleString('en-US', { style: 'percent' })})
        </Card.FeaturedSubtitle>
        {translation.map((data, index) => (
          <View key={index}>
            <Text style={{ fontWeight: 'bold', paddingBottom: 2 }}>[ {data.time} ]</Text>
            <Text>{data.source}</Text>
            <Text style={{ fontStyle: 'italic' }}>{data.target}</Text>
            <Card.Divider style={{ marginTop: 15 }} />
          </View>
        ))}
      </Card>
    </View>
  )
}

export default App
