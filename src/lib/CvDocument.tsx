import {
  Document, Page, Text, StyleSheet
} from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: '#444',
    marginBottom: 6,
  },
  contact: {
    fontSize: 9,
    color: '#555',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
})

interface Props {
  cvContent: string
  candidateName?: string
}

export function CvDocument({ cvContent, candidateName = 'Abdellah Ait Ibour' }: Props) {
  const paragraphs = cvContent.split('\n\n').filter(Boolean)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{candidateName}</Text>
        <Text style={styles.subtitle}>Senior Program and Project Manager | IT Hospitality Technology</Text>
        <Text style={styles.contact}>Toronto, ON · +1 438 795 9488 · a.aitibour@mail.com · linkedin.com/in/abdellah-aitibour</Text>
        {paragraphs.map((para, i) => {
          const isSectionHeader = para.length < 60 && para === para.toUpperCase()
          if (isSectionHeader) {
            return <Text key={i} style={styles.sectionTitle}>{para}</Text>
          }
          return <Text key={i} style={styles.paragraph}>{para}</Text>
        })}
      </Page>
    </Document>
  )
}
