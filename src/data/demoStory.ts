import { Story, Chapter, LorebookEntry } from '../types/story';

// Helper function to convert plain text to Lexical JSON format
function formatContentForLexical(content: string): string {
    // Split into paragraphs
    const paragraphs = content.split(/\n\n+/).filter(Boolean);

    // Create editor state
    const editorState = {
        root: {
            children: paragraphs.map(paragraph => ({
                children: [
                    {
                        detail: 0,
                        format: 0,
                        mode: "normal",
                        style: "",
                        text: paragraph,
                        type: "text",
                        version: 1
                    }
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1
            })),
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1
        }
    };

    return JSON.stringify(editorState);
}

// Hardcoded demo story data
const demoStory = {
    id: 'demo-story-1',
    title: 'Demo SciFi Story',
    synopsis: 'A science fiction tale about the crew of the research vessel Hyperion',
    author: 'Demo Author',
    language: 'English',
    isDemo: true,
    chapters: [
        {
            id: 'chapter-1',
            title: 'First Contact',
            content: formatContentForLexical(`Captain Elena Reyes stood on the observation deck of the Hyperion, watching as Saturn's magnificent rings filled the viewscreen. After six months of travel, they had finally reached their destination—a routine mission to study ice composition in the planet's outer rings.

"Captain, I'm detecting something unusual in the B ring," Dr. Marcus Wei called from his station, his voice carrying an unusual edge of excitement. "There's a gravitational anomaly that doesn't match our models."

Reyes moved to Wei's console, studying the readings. "Could it be a new moonlet?"

"Negative," Wei replied, adjusting his spectacles. "The mass distribution is too uniform, and it's perfectly stationary relative to the ring particles. That's... impossible."

Engineer Aisha Patel joined them, her dark eyes narrowing at the display. "Whatever it is, it's creating a perfect void in the ring material—like it's repelling the ice particles."

Reyes made her decision quickly. "Alter course. Let's get a closer look."

As the Hyperion changed trajectory, tension built on the bridge. The object came into visual range, and collective gasps echoed through the command center. Embedded within Saturn's rings was a perfect dodecahedron, its surfaces so black they seemed to absorb light itself.

"It's artificial," Wei whispered, his hands trembling as they moved across his console. "The geometric precision is undeniable."

"Are we talking about an alien artifact?" Patel asked, voicing what everyone was thinking.

Reyes felt the weight of the moment. "Send a tight-beam transmission to Earth. Tell them we've found something that changes everything."

As the message was sent, Wei's console erupted with alerts. "Captain! The object is emitting some kind of field. It's... it's scanning us."

Before Reyes could respond, the lights flickered, and for a brief moment, each crew member saw something different reflected in the object's surface—visions so personal they would later struggle to describe them.

"All hands, maintain positions," Reyes ordered, fighting to keep her voice steady. "Dr. Wei, I want every sensor we have trained on that thing. Engineer Patel, prepare a probe for launch. Whatever this is, we're going to understand it."

As the crew scrambled to their tasks, Reyes couldn't shake the image she'd seen in the object's surface: Earth, but somehow different—more advanced, more harmonious. A future that might be, or might have been.

The Hyperion had set out to study ice. Instead, they'd found something that might redefine humanity's place in the universe.`),
            summary: 'The research vessel Hyperion, led by Captain Elena Reyes, discovers a perfect dodecahedron embedded in Saturn\'s rings while on a routine mission. Science Officer Marcus Wei confirms it\'s artificial, and Engineer Aisha Patel notes its unusual properties. When they approach for closer study, the object scans the ship and briefly shows each crew member personalized visions. Reyes orders comprehensive analysis while sending word to Earth about their potentially history-changing discovery.',
            povType: 'Third Person Omniscient',
            povCharacter: 'Captain Elena Reyes',
            isDemo: true
        },
        {
            id: 'chapter-2',
            title: 'Theories and Tensions',
            content: formatContentForLexical(`Three days had passed since the discovery, and the Hyperion buzzed with activity. In the main lab, Dr. Wei had barely slept, his workstation cluttered with simulations and analysis results.

"It defies everything we know about physics," he explained to Captain Reyes, who had ordered him to provide an update. "The material absorbs all electromagnetic radiation—light, radio waves, everything. Yet it maintains a constant temperature and emits no radiation of its own."

"Could it be a probe from another civilization?" Reyes asked, studying the holographic representation rotating above the table.

Wei ran a hand through his disheveled hair. "That's the most logical explanation, but there's more. Carbon dating from particles we collected around it suggests it's been here for over two billion years."

"That predates complex life on Earth," Reyes said, the implications settling heavily on her shoulders.

Engineer Patel entered, carrying a tablet. "The probe results are in. It's generating a localized gravitational field that keeps it perfectly positioned within the rings. And there's something else—the field fluctuates in patterns that resemble mathematical sequences."

"It's communicating?" Reyes asked.

"Or calculating," Wei suggested, his eyes wide with possibility. "What if it's some kind of ancient computer?"

Tensions rose as the crew debated their next steps. Some, like Wei, advocated for direct contact. Others, including Patel, urged caution.

"We don't know what triggered those visions," Patel argued during the crew meeting. "For all we know, it could be scanning our brains, learning our weaknesses."

"Or trying to communicate in the only way it can," Wei countered. "The visions were meaningful to each of us. Mine showed me equations—solutions to problems I've been working on for years."

The debate was interrupted by a message from Earth: given the potential significance of the discovery, a military vessel had been dispatched. It would arrive in three weeks.

"Three weeks," Reyes mused after dismissing the crew. "That's how long we have to make first contact our way, before the military takes over."

Later that night, Reyes found Wei working alone in the lab. "The visions," she said quietly. "What do you think they mean?"

Wei looked up, his expression uncharacteristically vulnerable. "I think it's showing us possibilities—futures that could exist. The question is: is it showing us these things to help us, or to manipulate us?"

As if in response, the ship's lights flickered briefly, and both of them felt a subtle shift—as though something was listening, considering, deciding.

"Whatever it is," Reyes said, "I think it's aware of us now. And I think we need to be very careful about what we do next."`),
            summary: 'Three days after the discovery, Dr. Wei determines the object is billions of years old and defies known physics. Engineer Patel\'s probe reveals it generates patterns resembling mathematical sequences. The crew debates whether to attempt direct contact, with Wei advocating for engagement while Patel urges caution. Earth informs them a military vessel will arrive in three weeks, creating a deadline for the scientific team to make progress their way. Captain Reyes and Wei discuss the personal visions they experienced, wondering if the object is trying to help or manipulate them.',
            povType: 'Third Person Omniscient',
            povCharacter: undefined,
            isDemo: true
        },
        {
            id: 'chapter-3',
            title: 'The Approach',
            content: formatContentForLexical(`"Approaching optimal intercept position," Patel announced from the pilot's station. The Hyperion glided silently through the glittering ice particles of Saturn's rings, drawing ever closer to the anomaly.

After a week of observation and debate, Captain Reyes had made the decision: they would attempt direct contact using a specially designed shuttle. The small craft, reinforced against the anomaly's gravitational fluctuations, would carry Wei and Patel to within meters of the object.

"Remember the protocol," Reyes reminded them over the comm as they prepared to board the shuttle. "No physical contact without authorization. If anything unexpected happens, you abort immediately."

Wei nodded absently, his attention already focused on the equipment he was bringing—sensors designed to penetrate the object's light-absorbing surface. Patel performed final checks on her environmental suit with methodical precision.

"We'll be fine, Captain," she assured Reyes. "I've triple-checked every system."

As the shuttle detached from the Hyperion, an uneasy silence fell over the bridge. Reyes watched the small craft's progress on the main viewscreen, her hands clasped tightly behind her back.

The shuttle approached the anomaly cautiously. Up close, the dodecahedron's perfect geometry was even more unsettling—each pentagonal face identical, the edges impossibly precise.

"Beginning sensor sweep," Wei reported, his voice tight with excitement.

Suddenly, Patel gasped. "The surface—it's changing!"

Through the shuttle's viewport, they watched as the face nearest to them seemed to ripple, its perfect blackness giving way to a swirling pattern of light and color.

"Are you seeing this, Hyperion?" Wei asked, his fingers flying across his console to record the phenomenon.

On the bridge, Reyes leaned forward. "We see it. What's happening?"

"It's responding to our presence," Wei replied. "The patterns—they're organizing into... I think they're symbols of some kind."

The symbols shifted and changed, flowing across the object's surface in sequences that seemed almost familiar, yet utterly alien.

"It's trying to communicate," Wei whispered.

Patel, more practical, was monitoring their systems. "Captain, we're experiencing some power fluctuations. Nothing critical yet, but—"

She was cut off as the shuttle's lights dimmed momentarily. When they came back on, both Wei and Patel froze. Floating in the center of the shuttle was a three-dimensional projection—a perfect replica of the solar system, but with subtle differences. Saturn had no rings, and Earth... Earth was different, its continents reshaped, its oceans altered.

"It's showing us another reality," Wei breathed. "A parallel Earth."

Before they could process this, the projection changed, showing a sequence of events: a massive object striking Earth, oceans boiling, continents fracturing.

"An extinction event," Patel said grimly. "Is it showing us our past or our future?"

The projection shifted again, this time showing the anomaly itself moving from Saturn's rings to Earth orbit, then a series of changes to the planet below—healing, restoration.

"Captain," Wei's voice was barely audible. "I think it's offering to help us."

On the Hyperion, Reyes felt a chill run down her spine. "Or showing us what it wants us to believe. Return to the ship immediately. We need to analyze this data before we proceed further."

As the shuttle turned back toward the Hyperion, none of them noticed the subtle change in the anomaly's surface—a pattern of light that briefly formed an image resembling human DNA, then twisted into something new, something different.

Something evolving.`),
            summary: 'Captain Reyes authorizes a direct approach using a shuttle piloted by Wei and Patel. As they near the anomaly, its surface changes, displaying shifting symbols that appear to be communication attempts. The object creates a holographic projection showing an alternate solar system where Saturn has no rings and Earth\'s geography is different. It then displays a sequence showing Earth being devastated by a cosmic impact, followed by the anomaly moving to Earth and somehow healing the planet. Wei believes it\'s offering help, but Reyes, concerned about manipulation, orders them to return for data analysis. Unknown to the crew, the anomaly briefly displays an image of human DNA transforming into something new.',
            povType: 'Third Person Omniscient',
            povCharacter: undefined,
            isDemo: true
        }
    ],
    lorebookEntries: [
        {
            id: 'lorebook-entry-1',
            name: 'Captain Elena Reyes',
            description: `A veteran space explorer with 15 years of experience commanding deep space missions. Reyes is known for her calm demeanor in crisis situations and analytical approach to problem-solving. She has a background in astrophysics and was specifically chosen to lead the Hyperion mission due to her expertise in anomalous celestial phenomena. She carries the weight of her crew's safety on her shoulders and struggles with the responsibility of making decisions that could affect humanity's future.

Relationships:
  - Leader: Commands respect from her crew through experience rather than authority
  - Mentor: Has a special bond with Science Officer Wei, whom she's grooming for command`,
            category: 'character',
            tags: ['Captain Elena Reyes', 'Elena', 'Reyes'],
            metadata: {
                type: 'Human',
                importance: 'major',
                status: 'active'
            },
            isDemo: true
        },
        {
            id: 'lorebook-entry-2',
            name: 'Dr. Marcus Wei',
            description: `The Hyperion's brilliant but socially awkward science officer. Wei has three PhDs in quantum physics, xenobiology, and computational mathematics. He's the first to recognize the anomaly's significance and becomes increasingly obsessed with understanding it. Wei struggles with expressing emotions and often misses social cues, but his analytical mind proves invaluable to the mission. He secretly harbors feelings for Engineer Patel but doesn't know how to express them.

Relationships:
  - Professional: Respects Captain Reyes as a mentor and leader
  - Complicated: Has unacknowledged feelings for Engineer Patel`,
            category: 'character',
            tags: ['Dr. Marcus Wei', 'Marcus', 'Wei'],
            metadata: {
                type: 'Human',
                importance: 'major',
                status: 'active'
            },
            isDemo: true
        },
        {
            id: 'lorebook-entry-3',
            name: 'Engineer Aisha Patel',
            description: `The Hyperion's chief engineer and resident pragmatist. Patel has an intuitive understanding of machinery and can fix almost anything with limited resources. She's skeptical of Wei's theories about the anomaly but is the one who develops the technology to safely approach and study it. Patel comes from a long line of engineers who worked on Earth's space elevators. She values practical solutions over theoretical possibilities and often serves as the voice of reason when the others get carried away with speculation.

Relationships:
  - Friendly: Aware of Wei's feelings but unsure how to address them
  - Respectful: Trusts Captain Reyes' judgment but isn't afraid to voice concerns`,
            category: 'character',
            tags: ['Engineer Aisha Patel', 'Aisha', 'Patel'],
            metadata: {
                type: 'Human',
                importance: 'major',
                status: 'active'
            },
            isDemo: true
        },
        {
            id: 'lorebook-entry-4',
            name: 'The Anomaly',
            description: 'A perfectly geometric dodecahedron approximately 15 meters in diameter, embedded within Saturn\'s rings. The object appears to be made of an unknown material that absorbs all electromagnetic radiation directed at it. It emits no heat or radiation but creates localized gravitational distortions. Carbon dating suggests it\'s over 2 billion years old, predating Earth\'s formation. When approached, it seems to respond to conscious thought, creating visual hallucinations unique to each observer.',
            category: 'item',
            tags: ['The Anomaly', 'Anomaly', 'Anomaly of Saturn\'s Rings'],
            metadata: {
                type: 'Unknown Object',
                importance: 'major',
                status: 'active'
            },
            isDemo: true
        },
        {
            id: 'lorebook-entry-5',
            name: 'Hyperion Research Vessel',
            description: 'A state-of-the-art research vessel designed for deep space exploration and extended missions. The Hyperion features experimental quantum communication arrays, allowing near-instantaneous communication with Earth despite the distance. It\'s equipped with advanced sensors capable of detecting minute changes in radiation, gravitational fields, and spatial distortions. The ship\'s AI, ARIA (Advanced Research Intelligence Assistant), helps manage ship systems and analyze data. The Hyperion has living quarters for up to 12 crew members and can sustain life support for three years without resupply.',
            category: 'item',
            tags: ['Hyperion Research Vessel', 'Hyperion', 'Hyperion Research Vessel'],
            metadata: {
                type: 'Spacecraft',
                importance: 'major',
                status: 'active'
            },
            isDemo: true
        }
    ]
};

export default demoStory;