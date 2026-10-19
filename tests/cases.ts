export type Example = { id: string; category: string; input: string; reference: string; mode: 'correct'|'natural'; preserve?: string[]; unchanged?: boolean };
// Human-authored references. Alternative valid corrections require human review; exact match is not an accuracy score.
const groups: Record<string, [string,string][]> = {
 basic: [
 ["She go to school every day.","She goes to school every day."],
 ["They is waiting outside.","They are waiting outside."],
 ["He don't like coffee.","He doesn't like coffee."],
 ["I has two brothers.","I have two brothers."],
 ["We was late yesterday.","We were late yesterday."],
 ["There is three apples on the table.","There are three apples on the table."],
 ["My sister work in a bank.","My sister works in a bank."],
 ["The children plays in the park.","The children play in the park."]
 ],
 advanced: [
 ["If I would have known, I would have called.","If I had known, I would have called."],
 ["Neither of the answers are correct.","Neither of the answers is correct."],
 ["Hardly I had arrived when it started raining.","Hardly had I arrived when it started raining."],
 ["Not only she sings, but she also writes music.","Not only does she sing, but she also writes music."],
 ["Had I knew about the delay, I would have waited.","Had I known about the delay, I would have waited."],
 ["I wish I have more time yesterday.","I wish I had had more time yesterday."],
 ["It is essential that he is present at tomorrow's hearing.","It is essential that he be present at tomorrow's hearing."],
 ["No sooner had we left when the phone rang.","No sooner had we left than the phone rang."]
 ],
 multiple_errors: [
 ["She don't have a informations about project.","She doesn't have any information about the project."],
 ["He didn't explained me a reasons for delay.","He didn't explain the reasons for the delay to me."],
 ["Yesterday I go to office and discuss about a issue with manager.","Yesterday I went to the office and discussed an issue with the manager."],
 ["They was very interested on buy a new equipments.","They were very interested in buying new equipment."],
 ["My friend have gave me an useful advices.","My friend has given me some useful advice."],
 ["I am agree with you because this informations are importance.","I agree with you because this information is important."],
 ["We didn't knew that the meeting have been cancel.","We didn't know that the meeting had been canceled."],
 ["She is more taller then me and speak English good.","She is taller than me and speaks English well."]
 ],
 articles: [
 ["He is a honest person.","He is an honest person."],
 ["She works as engineer.","She works as an engineer."],
 ["I bought an new laptop.","I bought a new laptop."],
 ["The life is unpredictable.","Life is unpredictable."],
 ["I need a advice about my application.","I need some advice about my application."],
 ["She has a MBA from a university in London.","She has an MBA from a university in London."],
 ["Sun rises in east.","The sun rises in the east."],
 ["Please close a door you opened.","Please close the door you opened."]
 ],
 prepositions: [
 ["We discussed about the proposal.","We discussed the proposal."],
 ["She is good in mathematics.","She is good at mathematics."],
 ["I am looking forward to meet you.","I am looking forward to meeting you."],
 ["He arrived to the airport at noon.","He arrived at the airport at noon."],
 ["It depends of the weather.","It depends on the weather."],
 ["Please explain me the problem.","Please explain the problem to me."],
 ["I have been waiting since two hours.","I have been waiting for two hours."],
 ["She is married with a teacher.","She is married to a teacher."]
 ],
 irregular_verbs: [
 ["He has went home.","He has gone home."],
 ["She buyed a book yesterday.","She bought a book yesterday."],
 ["I have wrote three emails.","I have written three emails."],
 ["They had ate before we arrived.","They had eaten before we arrived."],
 ["The glass was broke by accident.","The glass was broken by accident."],
 ["He teached me how to swim.","He taught me how to swim."],
 ["I seen her at the station yesterday.","I saw her at the station yesterday."],
 ["She has chose the blue dress.","She has chosen the blue dress."]
 ],
 natural: [
 ["I am writing this message for telling you that I cannot be able to attend tomorrow meeting.","I'm writing to let you know that I can't attend tomorrow's meeting."],
 ["Please do the needful and revert back to me.","Please take the necessary steps and get back to me."],
 ["I have a doubt regarding the date of our meeting.","I have a question about our meeting date."],
 ["I made a decision to take a rest because of feeling tired.","I decided to rest because I was tired."],
 ["Can you make me know when you are reaching here?","Can you let me know when you'll get here?"],
 ["It is my opinion that we should be having a discussion about this.","I think we should discuss this."],
 ["I was unable to make a connection with you through the phone.","I couldn't reach you by phone."],
 ["The reason for my lateness was because the traffic was heavy.","I was late because traffic was heavy."]
 ],
 professional: [
 ["Please finds attached the report.","Please find the attached report."],
 ["I would appreciate if you could send me the invoice.","I would appreciate it if you could send me the invoice."],
 ["We look forward to hear from you.","We look forward to hearing from you."],
 ["The meeting has been reschedule to Monday.","The meeting has been rescheduled to Monday."],
 ["Kindly let me know if you needs further informations.","Kindly let me know if you need further information."],
 ["I apologize for not replied sooner.","I apologize for not replying sooner."],
 ["Our team have completed all task assigned to us.","Our team has completed all the tasks assigned to us."],
 ["Could you please confirm weather you received my email?","Could you please confirm whether you received my email?"]
 ],
 casual: [
 ["Hey, how is things going?","Hey, how are things going?"],
 ["I didn't knew you were here!","I didn't know you were here!"],
 ["Lets grab a coffee after work.","Let's grab a coffee after work."],
 ["Your going to love this movie.","You're going to love this movie."],
 ["Me and Sam is coming over later.","Sam and I are coming over later."],
 ["I cant wait to seeing you!","I can't wait to see you!"],
 ["That sounds like a fun!","That sounds like fun!"],
 ["Thanks for help me out yesterday.","Thanks for helping me out yesterday."]
 ],
 complex: [
 ["The book, which I borrowed it from the library, is fascinating.","The book, which I borrowed from the library, is fascinating."],
 ["Although it was raining, but we went for a walk.","Although it was raining, we went for a walk."],
 ["The woman who her car was stolen called the police.","The woman whose car was stolen called the police."],
 ["Every one of the students who were selected have submitted a form.","Every one of the students who were selected has submitted a form."],
 ["The report that you asked me to review it is ready.","The report that you asked me to review is ready."],
 ["Despite of being tired, she finished the work that her manager had gave her.","Despite being tired, she finished the work that her manager had given her."],
 ["If the train arrives on time, we would reach the venue before the speech begins.","If the train arrives on time, we will reach the venue before the speech begins."],
 ["What matters most are whether everyone has a chance to speak.","What matters most is whether everyone has a chance to speak."]
 ],
 already_correct: [
 ["I enjoy reading on rainy afternoons.","I enjoy reading on rainy afternoons."],
 ["If I had known, I would have called you.","If I had known, I would have called you."],
 ["Neither answer is correct.","Neither answer is correct."],
 ["Could you send me the report by Friday?","Could you send me the report by Friday?"],
 ["The colour of the theatre's curtains surprised me.","The colour of the theatre's curtains surprised me."],
 ["I don't think we should change the plan.","I don't think we should change the plan."],
 ["She said, “I'll be there at six.”","She said, “I'll be there at six.”"],
 ["Thanks! That was exactly what I needed.","Thanks! That was exactly what I needed."]
 ],
 ambiguous: [
 ["I saw her duck.","I saw her duck."],
 ["Visiting relatives can be tiring.","Visiting relatives can be tiring."],
 ["Alex told Jordan that they was late.","Alex told Jordan that they were late."],
 ["The chicken is ready to eat.","The chicken is ready to eat."],
 ["I didn't say she stole the money.","I didn't say she stole the money."],
 ["He saw the man with the telescope.","He saw the man with the telescope."],
 ["They said it might happens tomorrow.","They said it might happen tomorrow."],
 ["I am not sure whether Maya or Priya have the key.","I am not sure whether Maya or Priya has the key."]
 ],
 meaning: [
 ["Dr. Rao have not approved the 15 mg dose.","Dr. Rao has not approved the 15 mg dose."],
 ["We might delivers 27 boxes on 18 October 2026.","We might deliver 27 boxes on 18 October 2026."],
 ["Aisha paid $48.50, not $84.50, for order ZX-19.","Aisha paid $48.50, not $84.50, for order ZX-19."],
 ["Only three of the 12 samples was contaminated.","Only three of the 12 samples were contaminated."],
 ["I do not agrees to the new terms.","I do not agree to the new terms."],
 ["The estimate is approximately 2.7%, and it may changes.","The estimate is approximately 2.7%, and it may change."],
 ["Nora said she could not attending on 3 May.","Nora said she could not attend on 3 May."],
 ["The device must not be connects to a 240 V supply.","The device must not be connected to a 240 V supply."]
 ],
 paragraphs: [
 ["I was trying to explain him about the problem but he didn't understood what I am saying and that's why the things got more complicated.","I was trying to explain the problem to him, but he didn't understand what I was saying, which made things more complicated."],
 ["Yesterday we visits the new office. The rooms was spacious, but there wasn't enough chairs for everyone. Our manager said she will order more before Monday.","Yesterday we visited the new office. The rooms were spacious, but there weren't enough chairs for everyone. Our manager said she would order more before Monday."],
 ["Thank you for send the documents. I have review them and noticed that two page are missing. Could you please sends the complete file when you have time?","Thank you for sending the documents. I have reviewed them and noticed that two pages are missing. Could you please send the complete file when you have time?"],
 ["I have been working on this project since three weeks. Although the deadline is close, but we still needs to test the final version. I don't want to release it until everyone are satisfied.","I have been working on this project for three weeks. Although the deadline is close, we still need to test the final version. I don't want to release it until everyone is satisfied."],
 ["When I arrived at the station, the train had already leave. I asked a employee when the next train would arrives, but she didn't had the timetable. In the end, I decide to take the bus.","When I arrived at the station, the train had already left. I asked an employee when the next train would arrive, but she didn't have the timetable. In the end, I decided to take the bus."],
 ["Maya and I was planning a trip to Pune on 12 June. We had booked two ticket, but Maya became ill. We haven't decided whether to cancel or postponing the trip.","Maya and I were planning a trip to Pune on 12 June. We had booked two tickets, but Maya became ill. We haven't decided whether to cancel or postpone the trip."],
 ["The survey include 120 participants from three cities. Most of them prefers online classes, although some said they finds it difficult to concentrate at home. These results doesn't prove that online learning is better for everyone.","The survey includes 120 participants from three cities. Most of them prefer online classes, although some said they find it difficult to concentrate at home. These results don't prove that online learning is better for everyone."],
 ["Please bring the following items:\n- A notebook\n- Two pen\n- Your ID card\n\nThe session start at 9 a.m. and finishes at noon. If you arrives late, please enter quietly.","Please bring the following items:\n- A notebook\n- Two pens\n- Your ID card\n\nThe session starts at 9 a.m. and finishes at noon. If you arrive late, please enter quietly."]
 ],
 punctuation_spelling: [
 ["Its raining outside, take an umbrella.","It's raining outside; take an umbrella."],
 ["I recieved your adress yesterday.","I received your address yesterday."],
 ["The childrens toys are in the box.","The children's toys are in the box."],
 ["She asked where are you going?","She asked, “Where are you going?”"],
 ["We need milk bread and eggs.","We need milk, bread, and eggs."],
 ["Their going to leave they're bags over there.","They're going to leave their bags over there."],
 ["The companys policy affects all employee's.","The company's policy affects all employees."],
 ["I like cooking my family and my dog.","I like cooking, my family, and my dog."]
 ]
};
export const cases: Example[] = Object.entries(groups).flatMap(([category, rows])=>rows.map(([input,reference],i)=>({id:`${category}-${i+1}`,category,input,reference,mode:category==='natural'?'natural':'correct',unchanged:input===reference}))) as Example[];
